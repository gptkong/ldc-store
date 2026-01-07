"use server";

import { auth } from "@/lib/auth";
import { revalidateAllStoreCache } from "@/lib/cache";
import { db, restockRequests } from "@/lib/db";
import { desc, inArray, lte, sql } from "drizzle-orm";

export interface RestockRequester {
  userId: string;
  username: string;
  userImage?: string | null;
}

export interface RestockSummary {
  count: number;
  requesters: RestockRequester[];
}

const DEFAULT_MAX_REQUESTERS = 5;

function normalizeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

/**
 * 获取商品的「催补货」聚合信息（计数 + 最近 N 个头像）
 * - 仅返回与用户无关的数据，确保可用于 ISR 页面而不会导致缓存穿透/泄露
 */
export async function getRestockSummaryForProducts(input: {
  productIds: string[];
  maxRequesters?: number;
}): Promise<Record<string, RestockSummary>> {
  const productIds = normalizeIds(input.productIds);
  const maxRequesters = Math.max(1, input.maxRequesters ?? DEFAULT_MAX_REQUESTERS);

  if (productIds.length === 0) {
    return {};
  }

  try {
    const counts = await db
      .select({
        productId: restockRequests.productId,
        count: sql<number>`count(*)::int`,
      })
      .from(restockRequests)
      .where(inArray(restockRequests.productId, productIds))
      .groupBy(restockRequests.productId);

    const countMap = new Map(counts.map((row) => [row.productId, row.count]));

    // 使用 window function 在 DB 侧做“每个商品取最近 N 条”，避免拉全表再在 JS 里切片
    const ranked = db
      .select({
        productId: restockRequests.productId,
        userId: restockRequests.userId,
        username: restockRequests.username,
        userImage: restockRequests.userImage,
        createdAt: restockRequests.createdAt,
        rn: sql<number>`
          row_number() over (
            partition by ${restockRequests.productId}
            order by ${restockRequests.createdAt} desc
          )
        `.as("rn"),
      })
      .from(restockRequests)
      .where(inArray(restockRequests.productId, productIds))
      .as("ranked_restock_requests");

    const requesterRows = await db
      .select({
        productId: ranked.productId,
        userId: ranked.userId,
        username: ranked.username,
        userImage: ranked.userImage,
        createdAt: ranked.createdAt,
      })
      .from(ranked)
      .where(lte(ranked.rn, maxRequesters))
      .orderBy(ranked.productId, desc(ranked.createdAt));

    const requesterMap = new Map<string, RestockRequester[]>();
    for (const row of requesterRows) {
      const list = requesterMap.get(row.productId) ?? [];
      list.push({
        userId: row.userId,
        username: row.username,
        userImage: row.userImage ?? null,
      });
      requesterMap.set(row.productId, list);
    }

    const result: Record<string, RestockSummary> = {};
    for (const productId of productIds) {
      result[productId] = {
        count: countMap.get(productId) ?? 0,
        requesters: requesterMap.get(productId) ?? [],
      };
    }

    return result;
  } catch (error) {
    // 兜底：避免因为统计表缺失/权限问题导致前台页面不可用
    console.error("[getRestockSummaryForProducts] 查询催补货统计失败:", error);
    return {};
  }
}

export interface RequestRestockResult {
  success: boolean;
  message: string;
  summary?: RestockSummary;
}

/**
 * 记录一次「催补货」请求（按 userId 去重）
 */
export async function requestRestock(productId: string): Promise<RequestRestockResult> {
  const session = await auth();
  const user = session?.user as
    | { id?: string; username?: string; name?: string; image?: string; provider?: string }
    | undefined;

  // 关键：只允许 Linux DO 登录用户参与，避免游客刷量 + 方便展示头像 group
  if (!user?.id || user.provider !== "linux-do") {
    return { success: false, message: "请先使用 Linux DO 登录后再催补货" };
  }

  const safeProductId = productId.trim();
  if (!safeProductId) {
    return { success: false, message: "商品信息无效" };
  }

  const username = (user.username || user.name || "用户").trim() || "用户";
  const userImage = user.image ?? null;

  try {
    // 用 ON CONFLICT 做幂等：同一用户重复点击只会返回同一个记录，不会导致计数被刷
    await db.execute(sql`
      INSERT INTO restock_requests (product_id, user_id, username, user_image)
      VALUES (${safeProductId}, ${user.id}, ${username}, ${userImage})
      ON CONFLICT (product_id, user_id) DO UPDATE
      SET user_image = EXCLUDED.user_image
    `);

    // 刷新商店前台缓存：让其他用户尽快看到计数变化（同时仍保持 ISR 性能）
    await revalidateAllStoreCache();

    const summaryMap = await getRestockSummaryForProducts({ productIds: [safeProductId] });
    return {
      success: true,
      message: "已为你登记催补货",
      summary: summaryMap[safeProductId],
    };
  } catch (error) {
    console.error("[requestRestock] 记录催补货失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "催补货失败，请稍后重试",
    };
  }
}
