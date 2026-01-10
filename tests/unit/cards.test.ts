import { describe, expect, it, vi } from "vitest";

// 关键：避免在单元测试中初始化真实数据库连接（lib/db 会强依赖 DATABASE_URL）
vi.mock("@/lib/db", () => ({
  db: {},
  cards: {},
  products: {},
}));

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

import { createCard } from "@/lib/actions/cards";

describe("createCard", () => {
  it("should reject when user is not admin", async () => {
    authMock.mockResolvedValueOnce({
      user: {
        id: "u1",
        role: "user",
      },
    });

    const result = await createCard({
      productId: "00000000-0000-0000-0000-000000000000",
      content: "card-001",
      deduplicate: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("需要管理员权限");
  });

  it("should validate input before touching database", async () => {
    authMock.mockResolvedValueOnce({
      user: {
        id: "u1",
        role: "admin",
      },
    });

    const result = await createCard({
      productId: "not-a-uuid",
      content: "card-001",
      deduplicate: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("无效的商品ID");
  });

  it("should reject empty content", async () => {
    authMock.mockResolvedValueOnce({
      user: {
        id: "u1",
        role: "admin",
      },
    });

    const result = await createCard({
      productId: "00000000-0000-0000-0000-000000000000",
      content: "   ",
      deduplicate: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("卡密内容不能为空");
  });
});
