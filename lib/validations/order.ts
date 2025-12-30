import { z } from "zod";

// 创建订单验证（仅登录用户可下单）
export const createOrderSchema = z.object({
  productId: z.string().uuid("无效的商品ID"),
  quantity: z.number().int().min(1, "数量至少为1").max(100, "数量不能超过100"),
  paymentMethod: z.enum(["ldc", "alipay", "wechat", "usdt"]).default("ldc"),
});

// 管理员更新订单状态验证
export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pending", "paid", "completed", "expired", "refunded"]),
  adminRemark: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

