import { describe, expect, it } from "vitest";

import {
  batchCardOperationSchema,
  createCardSchema,
  importCardsSchema,
  updateCardSchema,
} from "@/lib/validations/card";

describe("validations/card", () => {
  it("createCardSchema 应拒绝空白内容（trim 后为空）", () => {
    const result = createCardSchema.safeParse({
      productId: "00000000-0000-0000-0000-000000000000",
      content: "   ",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    // 为什么要 trim：避免把“空行”写入库存，导致发货时出现空卡密
    expect(result.error.issues[0]?.message).toBe("卡密内容不能为空");
  });

  it("createCardSchema 应通过合法参数并裁剪前后空白", () => {
    const result = createCardSchema.safeParse({
      productId: "00000000-0000-0000-0000-000000000000",
      content: "  card-001  ",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.content).toBe("card-001");
    expect(result.data.deduplicate).toBe(true);
  });

  it("createCardSchema 应允许关闭去重开关", () => {
    const result = createCardSchema.safeParse({
      productId: "00000000-0000-0000-0000-000000000000",
      content: "card-001",
      deduplicate: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.deduplicate).toBe(false);
  });

  it("importCardsSchema 应通过合法参数并补齐 delimiter 默认值", () => {
    const result = importCardsSchema.safeParse({
      productId: "00000000-0000-0000-0000-000000000000",
      content: "a\nb\nc",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.delimiter).toBe("newline");
    expect(result.data.deduplicate).toBe(true);
  });

  it("importCardsSchema 应允许关闭去重开关", () => {
    const result = importCardsSchema.safeParse({
      productId: "00000000-0000-0000-0000-000000000000",
      content: "a\nb\nc",
      delimiter: "newline",
      deduplicate: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.deduplicate).toBe(false);
  });

  it("batchCardOperationSchema 应拒绝空数组", () => {
    const result = batchCardOperationSchema.safeParse({
      cardIds: [],
      action: "delete",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe("请选择至少一个卡密");
  });

  it("updateCardSchema 应拒绝无效 cardId UUID", () => {
    const result = updateCardSchema.safeParse({
      cardId: "not-a-uuid",
      content: "card-001",
    });
    expect(result.success).toBe(false);
  });
});
