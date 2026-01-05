"use server";

/**
 * 订单相关 Server Actions
 *
 * 时区策略说明：
 * - 所有时间使用 JavaScript Date 对象（内部为 UTC 时间戳）
 * - 数据库字段为 timestamp with time zone，PostgreSQL 自动以 UTC 存储
 * - 过期判断使用数据库 NOW() 函数，确保与存储时间一致
 * - 前端显示时浏览器自动转换为用户本地时区
 */

import { db, orders, cards, products } from "@/lib/db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validations/order";
import { createPayment, refundOrder, isRefundEnabled, getRefundMode, getClientRefundParams, type PaymentFormData, type RefundMode, type ClientRefundParams } from "@/lib/payment/ldc";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-utils";
import { getExpireTime } from "@/lib/time";

/**
 * 从请求头自动获取网站 URL
 */
async function getSiteUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}

// 生成订单号: 时间戳 + 随机字符
function generateOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(6).toUpperCase();
  return `LD${timestamp}${random}`;
}

// 订单过期时间（分钟）
const ORDER_EXPIRE_MINUTES = parseInt(process.env.ORDER_EXPIRE_MINUTES || "10", 10);

export interface CreateOrderResult {
  success: boolean;
  message: string;
  orderNo?: string;
  paymentForm?: PaymentFormData;
}

/**
 * 创建订单
 * 1. 验证登录状态
 * 2. 验证输入
 * 3. 检查库存
 * 4. 创建订单并锁定卡密（使用事务）
 * 5. 调用支付接口获取支付链接
 * 
 * 仅登录用户可下单
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // 1. 验证登录状态
  const session = await auth();
  const user = session?.user as { id?: string; username?: string; provider?: string } | undefined;

  if (!user?.id || user.provider !== "linux-do") {
    return {
      success: false,
      message: "请先登录后再下单",
    };
  }

  // 2. 验证输入
  const validationResult = createOrderSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: validationResult.error.issues[0].message,
    };
  }

  const { productId, quantity, paymentMethod } = validationResult.data;

  try {
    // 2.1 释放过期订单，确保库存准确（懒加载策略）
    await releaseExpiredOrders();
    
    // 2.2 获取商品信息
    const product = await db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.isActive, true)),
    });

    if (!product) {
      return { success: false, message: "商品不存在或已下架" };
    }

    // 验证购买数量限制
    if (quantity < product.minQuantity || quantity > product.maxQuantity) {
      return {
        success: false,
        message: `购买数量需在 ${product.minQuantity} - ${product.maxQuantity} 之间`,
      };
    }

    // 3. 使用事务处理订单创建和卡密锁定
    const result = await db.transaction(async (tx) => {
      // 3.1 查询可用库存（使用 FOR UPDATE 锁定行）
      const availableCards = await tx
        .select({ id: cards.id })
        .from(cards)
        .where(and(eq(cards.productId, productId), eq(cards.status, "available")))
        .limit(quantity)
        .for("update");

      if (availableCards.length < quantity) {
        throw new Error(`库存不足，当前仅剩 ${availableCards.length} 件`);
      }

      const cardIds = availableCards.map((c) => c.id);
      const orderNo = generateOrderNo();
      const totalAmount = parseFloat(product.price) * quantity;
      // 计算订单过期时间（UTC 时间戳，存入数据库时自动转换）
      const expiredAt = getExpireTime(ORDER_EXPIRE_MINUTES);

      // 3.2 创建订单
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNo,
          productId,
          productName: product.name,
          productPrice: product.price,
          quantity,
          totalAmount: totalAmount.toFixed(2),
          paymentMethod,
          userId: user.id,
          username: user.username,
          expiredAt,
        })
        .returning();

      // 3.3 锁定卡密
      await tx
        .update(cards)
        .set({
          status: "locked",
          orderId: newOrder.id,
          lockedAt: new Date(),
        })
        .where(
          and(
            eq(cards.productId, productId),
            eq(cards.status, "available"),
            inArray(cards.id, cardIds)
          )
        );

      return { order: newOrder, totalAmount };
    });

    // 4. 刷新页面缓存，确保库存显示准确
    revalidatePath("/");
    revalidatePath(`/product/${product.slug}`);

    // 5. 调用支付接口（如果是 LDC 支付）
    let paymentForm: PaymentFormData | undefined;
    if (paymentMethod === "ldc") {
      try {
        const siteUrl = await getSiteUrl();
        paymentForm = createPayment(
          result.order.orderNo,
          result.totalAmount,
          product.name,
          siteUrl
        );
      } catch (error) {
        // 支付接口调用失败，但订单已创建
        console.error("创建支付链接失败:", error);
        return {
          success: true,
          message: "订单创建成功，但支付链接生成失败，请稍后重试支付",
          orderNo: result.order.orderNo,
        };
      }
    }

    return {
      success: true,
      message: "订单创建成功",
      orderNo: result.order.orderNo,
      paymentForm,
    };
  } catch (error) {
    console.error("创建订单失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "创建订单失败，请稍后重试",
    };
  }
}

/**
 * 处理支付成功回调
 * 1. 更新订单状态
 * 2. 更新卡密状态为已售出
 * 3. 更新商品销量
 */
export async function handlePaymentSuccess(
  orderNo: string,
  tradeNo: string
): Promise<boolean> {
  try {
    let productSlug: string | null = null;

    await db.transaction(async (tx) => {
      // 1. 获取并更新订单
      const [order] = await tx
        .update(orders)
        .set({
          status: "completed",
          tradeNo,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(orders.orderNo, orderNo), eq(orders.status, "pending")))
        .returning();

      if (!order) {
        throw new Error("订单不存在或已处理");
      }

      // 2. 更新卡密状态为已售出
      await tx
        .update(cards)
        .set({
          status: "sold",
          soldAt: new Date(),
        })
        .where(eq(cards.orderId, order.id));

      // 3. 更新商品销量
      if (order.productId) {
        await tx
          .update(products)
          .set({
            salesCount: sql`${products.salesCount} + ${order.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, order.productId));

        // 获取商品 slug 用于刷新缓存
        const product = await tx.query.products.findFirst({
          where: eq(products.id, order.productId),
          columns: { slug: true },
        });
        productSlug = product?.slug || null;
      }
    });

    // 刷新页面缓存
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/");
    if (productSlug) {
      revalidatePath(`/product/${productSlug}`);
    }
    return true;
  } catch (error) {
    console.error("处理支付成功回调失败:", error);
    return false;
  }
}

/**
 * 释放过期订单的锁定卡密
 * 采用懒加载策略：在关键操作时自动调用
 *
 * 时区一致性说明：
 * - 订单创建时 expiredAt 使用 JavaScript Date（UTC 时间戳）
 * - PostgreSQL 存储为 timestamp with time zone（内部 UTC）
 * - 过期检查使用数据库 NOW() 函数（与存储时区一致）
 * - 这确保了无论服务器部署在哪个时区，过期判断都是准确的
 */
export async function releaseExpiredOrders(): Promise<number> {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. 找出所有过期的待支付订单
      // 使用数据库 NOW() 确保与 expiredAt 时区一致
      const expiredOrders = await tx
        .update(orders)
        .set({
          status: "expired",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.status, "pending"),
            sql`${orders.expiredAt} < NOW()`
          )
        )
        .returning({ id: orders.id });

      if (expiredOrders.length === 0) {
        return 0;
      }

      // 2. 释放这些订单锁定的卡密
      const orderIds = expiredOrders.map((o) => o.id);
      await tx
        .update(cards)
        .set({
          status: "available",
          orderId: null,
          lockedAt: null,
        })
        .where(
          and(
            eq(cards.status, "locked"),
            inArray(cards.orderId, orderIds)
          )
        );

      return expiredOrders.length;
    });

    // 刷新页面缓存
    if (result > 0) {
      revalidatePath("/admin/orders");
      revalidatePath("/");
    }
    return result;
  } catch (error) {
    console.error("释放过期订单失败:", error);
    return 0;
  }
}

/**
 * 管理员手动完成订单
 */
export async function adminCompleteOrder(
  orderId: string,
  adminRemark?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  try {
    let productSlug: string | null = null;

    await db.transaction(async (tx) => {
      // 1. 更新订单状态
      const [order] = await tx
        .update(orders)
        .set({
          status: "completed",
          paidAt: new Date(),
          adminRemark,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (!order) {
        throw new Error("订单不存在");
      }

      // 2. 更新卡密状态
      await tx
        .update(cards)
        .set({
          status: "sold",
          soldAt: new Date(),
        })
        .where(eq(cards.orderId, order.id));

      // 3. 更新销量
      if (order.productId) {
        await tx
          .update(products)
          .set({
            salesCount: sql`${products.salesCount} + ${order.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, order.productId));

        // 获取商品 slug 用于刷新缓存
        const product = await tx.query.products.findFirst({
          where: eq(products.id, order.productId),
          columns: { slug: true },
        });
        productSlug = product?.slug || null;
      }
    });

    // 刷新页面缓存
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/");
    if (productSlug) {
      revalidatePath(`/product/${productSlug}`);
    }
    return { success: true, message: "订单已完成" };
  } catch (error) {
    console.error("手动完成订单失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "操作失败",
    };
  }
}

/**
 * 获取当前登录用户的历史订单
 */
export async function getUserOrders() {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; username?: string; provider?: string } | undefined;

    if (!user?.id || user.provider !== "linux-do") {
      return { success: false, message: "请先登录", data: [] };
    }

    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, user.id),
      with: {
        cards: {
          columns: {
            id: true,
            content: true,
            status: true,
          },
        },
      },
      orderBy: [desc(orders.createdAt)],
    });

    const ordersWithCards = userOrders.map((order) => {
      // 仅当订单已完成时才显示卡密
      const cardsToShow =
        order.status === "completed" || order.status === "paid"
          ? order.cards.filter((c) => c.status === "sold")
          : [];

      return {
        orderNo: order.orderNo,
        productName: order.productName,
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        cards: cardsToShow.map((c) => c.content),
      };
    });

    return {
      success: true,
      data: ordersWithCards,
    };
  } catch (error) {
    console.error("获取用户订单失败:", error);
    return {
      success: false,
      message: "获取订单失败，请稍后重试",
      data: [],
    };
  }
}

/**
 * 根据订单号获取订单详情（需验证用户身份）
 */
export async function getOrderByNo(orderNo: string) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; provider?: string } | undefined;

    if (!user?.id || user.provider !== "linux-do") {
      return { success: false, message: "请先登录" };
    }

    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.orderNo, orderNo),
        eq(orders.userId, user.id)
      ),
      with: {
        cards: {
          columns: {
            id: true,
            content: true,
            status: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, message: "订单不存在或无权访问" };
    }

    // 仅当订单已完成时才显示卡密
    const cardsToShow =
      order.status === "completed" || order.status === "paid"
        ? order.cards.filter((c) => c.status === "sold")
        : [];

    return {
      success: true,
      data: {
        orderNo: order.orderNo,
        productName: order.productName,
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        cards: cardsToShow.map((c) => c.content),
      },
    };
  } catch (error) {
    console.error("获取订单详情失败:", error);
    return {
      success: false,
      message: "获取订单失败，请稍后重试",
    };
  }
}

/**
 * 用户申请退款
 * 仅已完成的订单可以申请退款
 * 需要配置 LDC_PROXY_URL 才能使用退款功能
 */
export async function requestRefund(
  orderNo: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  // 检查退款功能是否启用
  if (!isRefundEnabled()) {
    return { success: false, message: "退款功能未启用" };
  }

  try {
    const session = await auth();
    const user = session?.user as { id?: string; provider?: string } | undefined;

    if (!user?.id || user.provider !== "linux-do") {
      return { success: false, message: "请先登录" };
    }

    if (!reason || reason.trim().length < 5) {
      return { success: false, message: "请填写退款原因（至少5个字符）" };
    }

    // 查找订单并验证所有权
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.orderNo, orderNo),
        eq(orders.userId, user.id)
      ),
    });

    if (!order) {
      return { success: false, message: "订单不存在或无权访问" };
    }

    // 检查订单状态
    if (order.status !== "completed") {
      return { success: false, message: "仅已完成的订单可以申请退款" };
    }

    // 更新订单状态为退款审核中
    await db
      .update(orders)
      .set({
        status: "refund_pending",
        refundReason: reason.trim(),
        refundRequestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    revalidatePath("/order/my");
    revalidatePath("/admin/orders");

    return { success: true, message: "退款申请已提交，请等待审核" };
  } catch (error) {
    console.error("申请退款失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "申请退款失败，请稍后重试",
    };
  }
}

/**
 * 管理员审批退款 - 通过
 * 调用 LDC 退款接口完成退款
 * 需要配置 LDC_PROXY_URL 才能使用退款功能
 */
export async function approveRefund(
  orderId: string,
  adminRemark?: string
): Promise<{ success: boolean; message: string }> {
  // 检查退款功能是否启用
  if (!isRefundEnabled()) {
    return { success: false, message: "退款功能未启用，请配置 LDC_PROXY_URL" };
  }

  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  try {
    // 获取订单信息
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return { success: false, message: "订单不存在" };
    }

    if (order.status !== "refund_pending") {
      return { success: false, message: "该订单不在退款审核中" };
    }

    if (!order.tradeNo) {
      return { success: false, message: "订单缺少支付流水号，无法退款" };
    }

    // 调用 LDC 退款接口
    const refundResult = await refundOrder(order.tradeNo, order.totalAmount);

    if (refundResult.code !== 1) {
      console.error("LDC 退款接口返回错误:", refundResult);
      return { 
        success: false, 
        message: `退款失败: ${refundResult.msg || "支付平台返回错误"}` 
      };
    }

    // 更新订单状态
    await db
      .update(orders)
      .set({
        status: "refunded",
        adminRemark: adminRemark || "退款已通过",
        refundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // 将卡密状态改回可用（如果需要回收卡密）
    // 注意：根据业务需求，退款后卡密可能需要标记为已使用或回收
    // 这里我们将其改回 available 以便重新销售
    await db
      .update(cards)
      .set({
        status: "available",
        orderId: null,
        soldAt: null,
      })
      .where(eq(cards.orderId, orderId));

    revalidatePath("/admin/orders");
    revalidatePath("/order/my");

    return { success: true, message: "退款成功" };
  } catch (error) {
    console.error("审批退款失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "退款操作失败",
    };
  }
}

/**
 * 管理员审批退款 - 拒绝
 */
export async function rejectRefund(
  orderId: string,
  adminRemark?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return { success: false, message: "订单不存在" };
    }

    if (order.status !== "refund_pending") {
      return { success: false, message: "该订单不在退款审核中" };
    }

    // 更新订单状态为已拒绝，并恢复为已完成状态
    await db
      .update(orders)
      .set({
        status: "refund_rejected",
        adminRemark: adminRemark || "退款申请已拒绝",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    revalidatePath("/admin/orders");
    revalidatePath("/order/my");

    return { success: true, message: "已拒绝退款申请" };
  } catch (error) {
    console.error("拒绝退款失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "操作失败",
    };
  }
}

/**
 * 获取退款订单列表（管理员）
 */
export async function getRefundOrders() {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限", data: [] };
  }

  try {
    const refundOrders = await db.query.orders.findMany({
      where: eq(orders.status, "refund_pending"),
      orderBy: [desc(orders.refundRequestedAt)],
    });

    return {
      success: true,
      data: refundOrders,
    };
  } catch (error) {
    console.error("获取退款订单失败:", error);
    return {
      success: false,
      message: "获取退款订单失败",
      data: [],
    };
  }
}

/**
 * 获取退款功能是否启用
 * 前端根据此状态决定是否显示退款相关按钮
 */
export async function getRefundEnabled(): Promise<boolean> {
  return isRefundEnabled();
}

/**
 * 获取退款模式
 */
export async function getOrderRefundMode(): Promise<RefundMode> {
  return getRefundMode();
}

/**
 * 获取客户端退款所需的参数
 * 用于客户端模式下，前端直接调用 LDC API
 */
export async function getClientRefundData(
  orderId: string
): Promise<{ 
  success: boolean; 
  message: string; 
  data?: ClientRefundParams;
}> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  const mode = getRefundMode();
  if (mode !== 'client') {
    return { success: false, message: "当前不是客户端退款模式" };
  }

  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return { success: false, message: "订单不存在" };
    }

    if (order.status !== "refund_pending") {
      return { success: false, message: "该订单不在退款审核中" };
    }

    if (!order.tradeNo) {
      return { success: false, message: "订单缺少支付流水号，无法退款" };
    }

    const params = getClientRefundParams(order.tradeNo, order.totalAmount);
    return { success: true, message: "获取成功", data: params };
  } catch (error) {
    console.error("获取客户端退款参数失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "获取退款参数失败",
    };
  }
}

/**
 * 客户端退款成功后标记订单已退款
 * 用于客户端模式下，前端调用 LDC API 成功后更新数据库
 */
export async function markOrderRefunded(
  orderId: string,
  adminRemark?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return { success: false, message: "订单不存在" };
    }

    if (order.status !== "refund_pending") {
      return { success: false, message: "该订单不在退款审核中" };
    }

    // 更新订单状态
    await db
      .update(orders)
      .set({
        status: "refunded",
        adminRemark: adminRemark || "退款已通过（客户端模式）",
        refundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // 将卡密状态改回可用
    await db
      .update(cards)
      .set({
        status: "available",
        orderId: null,
        soldAt: null,
      })
      .where(eq(cards.orderId, orderId));

    revalidatePath("/admin/orders");
    revalidatePath("/order/my");

    return { success: true, message: "订单状态已更新为已退款" };
  } catch (error) {
    console.error("标记订单已退款失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "操作失败",
    };
  }
}

