import { z } from "zod";

// 批量导入卡密验证
export const importCardsSchema = z.object({
  productId: z.string().uuid("无效的商品ID"),
  content: z.string().min(1, "卡密内容不能为空"),
  delimiter: z.enum(["newline", "comma"]).default("newline"),
  deduplicate: z.boolean().default(true),
});

// 新增单条卡密验证
export const createCardSchema = z.object({
  productId: z.string().uuid("无效的商品ID"),
  content: z.string().trim().min(1, "卡密内容不能为空").max(1000, "卡密内容过长"),
  deduplicate: z.boolean().default(true),
});

// 单个卡密操作验证
export const cardOperationSchema = z.object({
  cardId: z.string().uuid("无效的卡密ID"),
});

// 编辑卡密验证
export const updateCardSchema = z.object({
  cardId: z.string().uuid("无效的卡密ID"),
  content: z.string().trim().min(1, "卡密内容不能为空").max(1000, "卡密内容过长"),
});

// 批量卡密操作验证
export const batchCardOperationSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1, "请选择至少一个卡密"),
  action: z.enum(["delete", "reset"]), // reset: 重置为可用状态
});

export type ImportCardsInput = z.infer<typeof importCardsSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type CardOperationInput = z.infer<typeof cardOperationSchema>;
export type BatchCardOperationInput = z.infer<typeof batchCardOperationSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
