import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => authMocks.useSession(),
  signIn: (...args: unknown[]) => authMocks.signIn(...args),
}));

const actionMocks = vi.hoisted(() => ({
  requestRestock: vi.fn(),
}));

vi.mock("@/lib/actions/restock-requests", () => ({
  requestRestock: (...args: unknown[]) => actionMocks.requestRestock(...args),
}));

const sonnerMock = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("sonner", () => sonnerMock);

import { RestockRequestInline } from "@/components/store/restock-request-inline";

describe("RestockRequestInline", () => {
  beforeEach(() => {
    authMocks.useSession.mockReset();
    authMocks.signIn.mockReset();
    actionMocks.requestRestock.mockReset();
    sonnerMock.toast.error.mockReset();
    sonnerMock.toast.success.mockReset();
    localStorage.clear();
  });

  it("should prompt login when user is not logged in", () => {
    authMocks.useSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(
      <RestockRequestInline
        productId="p1"
        productName="商品 A"
        initialCount={0}
        initialRequesters={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /登录后催补货/i }));

    expect(sonnerMock.toast.error).toHaveBeenCalled();
    expect(authMocks.signIn).toHaveBeenCalledWith("linux-do");
    expect(actionMocks.requestRestock).not.toHaveBeenCalled();
  });

  it("should update count and avatars after requesting restock", async () => {
    authMocks.useSession.mockReturnValue({
      data: {
        user: {
          id: "u1",
          provider: "linux-do",
          username: "tester",
          image: "https://example.com/u1.png",
        },
      },
      status: "authenticated",
    });

    actionMocks.requestRestock.mockResolvedValueOnce({
      success: true,
      message: "已为你登记催补货",
      summary: {
        count: 3,
        requesters: [
          { userId: "u1", username: "tester", userImage: "https://example.com/u1.png" },
          { userId: "u2", username: "alice", userImage: "https://example.com/u2.png" },
        ],
      },
    });

    render(
      <RestockRequestInline
        productId="p1"
        productName="商品 A"
        initialCount={1}
        initialRequesters={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /催补货/i }));

    await waitFor(() => {
      expect(actionMocks.requestRestock).toHaveBeenCalledWith("p1");
    });

    // 使用服务端回包的最终态渲染
    expect(await screen.findByText("3 人已催")).toBeInTheDocument();
    // Radix Avatar 在 JSDOM 下通常不会进入“图片已加载”态，这里用 fallback 字母验证头像组渲染
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByLabelText("还有 1 人已催补货")).toBeInTheDocument();

    // 本地记录“已催”提示（弱一致）
    await waitFor(() => {
      expect(localStorage.getItem("restock_requested:p1")).toBe("1");
    });
  });
});
