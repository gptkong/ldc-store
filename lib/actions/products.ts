"use server";

import { db, products, cards, categories, orders } from "@/lib/db";
import { eq, and, desc, asc, sql, ilike, or, inArray } from "drizzle-orm";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validations/product";
import { requireAdmin } from "@/lib/auth-utils";
import { revalidateProductAndRelatedCache } from "@/lib/cache";
import {
  getRestockSummaryForProducts,
  type RestockSummary,
} from "@/lib/actions/restock-requests";

// 节流：最多每 60 秒检查一次过期订单
let lastExpireCheck = 0;
const EXPIRE_CHECK_INTERVAL = 60 * 1000; // 60 秒

/**
 * 懒加载释放过期订单（带节流）
 * 在商品查询时自动触发，确保库存显示准确
 */
async function lazyReleaseExpiredOrders() {
  const now = Date.now();
  if (now - lastExpireCheck < EXPIRE_CHECK_INTERVAL) {
    return; // 节流：跳过
  }
  lastExpireCheck = now;

  try {
    // 使用 CTE 一次性处理过期订单
    await db.execute(sql`
      WITH expired AS (
        UPDATE orders
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'pending' AND expired_at < NOW()
        RETURNING id
      )
      UPDATE cards
      SET status = 'available', order_id = NULL, locked_at = NULL
      WHERE status = 'locked' AND order_id IN (SELECT id FROM expired)
    `);
  } catch (error) {
    // 静默失败，不影响主流程
    console.error("[lazyReleaseExpiredOrders] 释放过期订单失败:", error);
  }
}

/**
 * 获取商品列表（前台）
 */
export async function getActiveProducts(options?: {
  categoryId?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}) {
  // 懒加载释放过期订单，确保库存准确
  await lazyReleaseExpiredOrders();
  
  const { categoryId, featured, limit = 20, offset = 0, search } = options || {};

  const conditions = [eq(products.isActive, true)];

  if (categoryId) {
    conditions.push(eq(products.categoryId, categoryId));
  }

  if (featured) {
    conditions.push(eq(products.isFeatured, true));
  }

  if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.description, `%${search}%`)
      )!
    );
  }

  const productList = await db.query.products.findMany({
    where: and(...conditions),
    // 为什么这样做：首页/分类页只需要展示用字段；避免把 content/images 等大字段从 DB 拉出来，降低首屏与预取成本。
    columns: {
      id: true,
      categoryId: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      originalPrice: true,
      coverImage: true,
      isFeatured: true,
      salesCount: true,
      sortOrder: true,
      createdAt: true,
    },
    with: {
      category: {
        columns: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [desc(products.isFeatured), asc(products.sortOrder), desc(products.createdAt)],
    limit,
    offset,
  });

  // 如果没有商品，直接返回空数组
  if (productList.length === 0) {
    return [];
  }

  // 获取每个商品的库存数量
  const productIds = productList.map((p) => p.id);
  const stockCounts = await db
    .select({
      productId: cards.productId,
      count: sql<number>`count(*)::int`,
    })
    .from(cards)
    .where(
      and(
        inArray(cards.productId, productIds),
        eq(cards.status, "available")
      )
    )
    .groupBy(cards.productId);

  const stockMap = new Map(stockCounts.map((s) => [s.productId, s.count]));

  // 为什么这样做：催补货入口只在“已售罄”时展示；对有库存商品统计催补货属于无意义开销，会放大首页/分类页渲染与 Link 预取压力。
  const outOfStockProductIds = productIds.filter(
    (productId) => (stockMap.get(productId) ?? 0) === 0
  );
  const restockSummary: Record<string, RestockSummary> =
    outOfStockProductIds.length > 0
      ? await getRestockSummaryForProducts({
          productIds: outOfStockProductIds,
          maxRequesters: 5,
        })
      : {};

  return productList.map((product) => ({
    ...product,
    stock: stockMap.get(product.id) || 0,
    restockRequestCount: restockSummary[product.id]?.count ?? 0,
    restockRequesters: restockSummary[product.id]?.requesters ?? [],
  }));
}

/**
 * 获取商品详情
 */
export async function getProductBySlug(slug: string) {
  // 懒加载释放过期订单，确保库存准确
  await lazyReleaseExpiredOrders();
  
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.isActive, true)),
    // 为什么这样做：详情页展示字段明确，精选 columns 可以减少 DB 传输与序列化成本（尤其是 content/images 等可变大字段）。
    columns: {
      id: true,
      categoryId: true,
      name: true,
      slug: true,
      description: true,
      content: true,
      price: true,
      originalPrice: true,
      coverImage: true,
      images: true,
      isFeatured: true,
      minQuantity: true,
      maxQuantity: true,
      salesCount: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      category: true,
    },
  });

  if (!product) {
    return null;
  }

  // 获取库存数量
  const [stockCount] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(cards)
    .where(and(eq(cards.productId, product.id), eq(cards.status, "available")));

  const stock = stockCount?.count || 0;

  // 为什么这样做：详情页只有在售罄时才展示“催补货”，因此对有库存商品不必额外查询统计信息。
  const restockSummary: Record<string, RestockSummary> =
    stock === 0
      ? await getRestockSummaryForProducts({
          productIds: [product.id],
          maxRequesters: 8,
        })
      : {};

  return {
    ...product,
    stock,
    restockRequestCount: restockSummary[product.id]?.count ?? 0,
    restockRequesters: restockSummary[product.id]?.requesters ?? [],
  };
}

/**
 * 获取商品详情（通过 ID）
 */
export async function getProductById(id: string) {
  try {
    await requireAdmin();
  } catch {
    return null;
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      category: true,
    },
  });

  if (!product) {
    return null;
  }

  // 获取库存数量
  const [stockCount] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(cards)
    .where(and(eq(cards.productId, product.id), eq(cards.status, "available")));

  return {
    ...product,
    stock: stockCount?.count || 0,
  };
}

/**
 * 获取所有商品（管理后台）
 */
export async function getAllProducts(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const { limit = 50, offset = 0, search } = options || {};

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.description, `%${search}%`)
      )!
    );
  }

  const productList = await db.query.products.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      category: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [asc(products.sortOrder), desc(products.createdAt)],
    limit,
    offset,
  });

  // 如果没有商品，直接返回空数组
  if (productList.length === 0) {
    return [];
  }

  // 获取库存统计
  const productIds = productList.map((p) => p.id);
  const stockStats = await db
    .select({
      productId: cards.productId,
      status: cards.status,
      count: sql<number>`count(*)::int`,
    })
    .from(cards)
    .where(inArray(cards.productId, productIds))
    .groupBy(cards.productId, cards.status);

  const stockMap = new Map<string, { available: number; sold: number; locked: number }>();
  for (const stat of stockStats) {
    const existing = stockMap.get(stat.productId) || { available: 0, sold: 0, locked: 0 };
    existing[stat.status as keyof typeof existing] = stat.count;
    stockMap.set(stat.productId, existing);
  }

  return productList.map((product) => ({
    ...product,
    stockStats: stockMap.get(product.id) || { available: 0, sold: 0, locked: 0 },
  }));
}

/**
 * 搜索商品（前台）
 * - 默认使用 ILIKE 模糊匹配（name/description/content）
 * - 为避免慢查询放大，建议在 UI 层限制最小关键词长度与分页大小
 */
export async function searchProducts(
  keyword: string,
  options?: {
    categoryId?: string;
    sort?: "relevance" | "price_asc" | "price_desc" | "sales_desc" | "newest";
    limit?: number;
    offset?: number;
  }
) {
  // 懒加载释放过期订单，确保库存准确
  await lazyReleaseExpiredOrders();

  const query = keyword.trim();
  const { categoryId, sort = "relevance", limit = 12, offset = 0 } = options || {};

  // 关键：短关键词会导致命中面过大，容易拖慢数据库；这里做兜底保护
  if (query.length < 2) {
    return { items: [], total: 0 };
  }

  const pattern = `%${query}%`;
  const matchCondition = or(
    ilike(products.name, pattern),
    ilike(products.description, pattern),
    ilike(products.content, pattern)
  )!;

  const conditions = [eq(products.isActive, true), matchCondition];
  if (categoryId) {
    conditions.push(eq(products.categoryId, categoryId));
  }

  const whereClause = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(whereClause);

  if (!count) {
    return { items: [], total: 0 };
  }

  // 相关度排序（简单版）：命中 name > description > content
  const relevanceScore = sql<number>`
    (CASE WHEN ${products.name} ILIKE ${pattern} THEN 3 ELSE 0 END) +
    (CASE WHEN ${products.description} ILIKE ${pattern} THEN 2 ELSE 0 END) +
    (CASE WHEN ${products.content} ILIKE ${pattern} THEN 1 ELSE 0 END)
  `;

  const orderBy = (() => {
    switch (sort) {
      case "price_asc":
        return [asc(products.price), desc(products.isFeatured), asc(products.sortOrder), desc(products.createdAt)];
      case "price_desc":
        return [desc(products.price), desc(products.isFeatured), asc(products.sortOrder), desc(products.createdAt)];
      case "sales_desc":
        return [desc(products.salesCount), desc(products.isFeatured), asc(products.sortOrder), desc(products.createdAt)];
      case "newest":
        return [desc(products.createdAt)];
      case "relevance":
      default:
        return [desc(relevanceScore), desc(products.isFeatured), asc(products.sortOrder), desc(products.createdAt)];
    }
  })();

  const productList = await db.query.products.findMany({
    where: whereClause,
    with: {
      category: {
        columns: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy,
    limit,
    offset,
  });

  if (productList.length === 0) {
    return { items: [], total: count ?? 0 };
  }

  const productIds = productList.map((p) => p.id);
  const stockCounts = await db
    .select({
      productId: cards.productId,
      count: sql<number>`count(*)::int`,
    })
    .from(cards)
    .where(and(inArray(cards.productId, productIds), eq(cards.status, "available")))
    .groupBy(cards.productId);

  const stockMap = new Map(stockCounts.map((s) => [s.productId, s.count]));

  const restockSummary = await getRestockSummaryForProducts({
    productIds,
    maxRequesters: 5,
  });

  return {
    items: productList.map((product) => ({
      ...product,
      stock: stockMap.get(product.id) || 0,
      restockRequestCount: restockSummary[product.id]?.count ?? 0,
      restockRequesters: restockSummary[product.id]?.requesters ?? [],
    })),
    total: count ?? 0,
  };
}

/**
 * 创建商品
 */
export async function createProduct(input: CreateProductInput) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  const validationResult = createProductSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: validationResult.error.issues[0].message,
    };
  }

  try {
    const [product] = await db
      .insert(products)
      .values({
        ...validationResult.data,
        price: validationResult.data.price.toFixed(2),
        originalPrice: validationResult.data.originalPrice?.toFixed(2),
        coverImage: validationResult.data.coverImage || null,
      })
      .returning();

    // 获取分类 slug 用于清理分类页缓存
    let categorySlug: string | undefined;
    if (product.categoryId) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, product.categoryId),
        columns: { slug: true },
      });
      categorySlug = category?.slug;
    }

    await revalidateProductAndRelatedCache(product.slug, categorySlug);

    return { success: true, data: product };
  } catch (error) {
    console.error("创建商品失败:", error);
    // 检查是否是唯一约束冲突
    if (error instanceof Error && error.message.includes("unique")) {
      return { success: false, message: "商品URL标识已存在" };
    }
    return { success: false, message: "创建商品失败" };
  }
}

/**
 * 更新商品
 */
export async function updateProduct(id: string, input: UpdateProductInput) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  const validationResult = updateProductSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: validationResult.error.issues[0].message,
    };
  }

  try {
    const updateData: Record<string, unknown> = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    if (validationResult.data.price !== undefined) {
      updateData.price = validationResult.data.price.toFixed(2);
    }
    if (validationResult.data.originalPrice !== undefined) {
      updateData.originalPrice = validationResult.data.originalPrice?.toFixed(2);
    }
    if (validationResult.data.coverImage !== undefined) {
      updateData.coverImage = validationResult.data.coverImage || null;
    }

    const [product] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!product) {
      return { success: false, message: "商品不存在" };
    }

    // 获取分类 slug 用于清理分类页缓存
    let categorySlug: string | undefined;
    if (product.categoryId) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, product.categoryId),
        columns: { slug: true },
      });
      categorySlug = category?.slug;
    }

    await revalidateProductAndRelatedCache(product.slug, categorySlug);

    return { success: true, data: product };
  } catch (error) {
    console.error("更新商品失败:", error);
    if (error instanceof Error && error.message.includes("unique")) {
      return { success: false, message: "商品URL标识已存在" };
    }
    return { success: false, message: "更新商品失败" };
  }
}

/**
 * 删除商品
 */
export async function deleteProduct(id: string) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  try {
    // 检查是否有未完成的订单
    const hasActiveOrders = await db.query.orders.findFirst({
      where: and(
        eq(orders.productId, id),
        or(
          eq(orders.status, "pending"),
          eq(orders.status, "paid")
        )
      ),
    });

    if (hasActiveOrders) {
      return { success: false, message: "该商品有未完成的订单，无法删除" };
    }

    // 获取商品信息用于清理缓存
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      columns: { slug: true, categoryId: true },
    });

    let categorySlug: string | undefined;
    if (product?.categoryId) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, product.categoryId),
        columns: { slug: true },
      });
      categorySlug = category?.slug;
    }

    await db.delete(products).where(eq(products.id, id));

    await revalidateProductAndRelatedCache(product?.slug, categorySlug);

    return { success: true, message: "商品已删除" };
  } catch (error) {
    console.error("删除商品失败:", error);
    return { success: false, message: "删除商品失败" };
  }
}

/**
 * 切换商品上架状态
 */
export async function toggleProductActive(id: string) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return { success: false, message: "商品不存在" };
    }

    await db
      .update(products)
      .set({
        isActive: !product.isActive,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    // 获取分类 slug 用于清理分类页缓存
    let categorySlug: string | undefined;
    if (product.categoryId) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, product.categoryId),
        columns: { slug: true },
      });
      categorySlug = category?.slug;
    }

    await revalidateProductAndRelatedCache(product.slug, categorySlug);

    return {
      success: true,
      message: product.isActive ? "商品已下架" : "商品已上架",
    };
  } catch (error) {
    console.error("切换商品状态失败:", error);
    return { success: false, message: "操作失败" };
  }
}
