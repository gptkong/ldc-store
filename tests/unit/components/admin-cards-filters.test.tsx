import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => navigationMocks.push(...args),
  }),
}));

import { CardsFilters } from "@/app/(admin)/admin/cards/cards-filters";

describe("CardsFilters", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
  });

  it("应根据表单输入生成 href 并 router.push", async () => {
    render(
      <CardsFilters
        productId="p1"
        q=""
        status={undefined}
        orderNo=""
        pageSize={20}
      />
    );

    fireEvent.change(screen.getByLabelText("搜索卡密"), {
      target: { value: " abc " },
    });
    fireEvent.change(screen.getByLabelText("按状态筛选"), {
      target: { value: "sold" },
    });
    fireEvent.change(screen.getByLabelText("按订单号查卡密"), {
      target: { value: "ORDER_1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "筛选" }));

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenLastCalledWith(
        "/admin/cards?product=p1&q=abc&status=sold&orderNo=ORDER_1&pageSize=20"
      );
    });
  });

  it("无 active filters 时不显示重置按钮", () => {
    render(
      <CardsFilters
        productId="p1"
        q=""
        status={undefined}
        orderNo=""
        pageSize={20}
      />
    );

    expect(screen.queryByRole("button", { name: "" })).toBeNull();
  });

  it("点击重置应回到基础筛选（保留 product 与 pageSize）", () => {
    render(
      <CardsFilters
        productId="p1"
        q="abc"
        status="available"
        orderNo=""
        pageSize={20}
      />
    );

    const buttons = screen.getAllByRole("button");
    const resetButton = buttons.find((btn) => btn.textContent === "");
    expect(resetButton).toBeDefined();
    fireEvent.click(resetButton!);
    expect(navigationMocks.push).toHaveBeenLastCalledWith("/admin/cards?product=p1&pageSize=20");
  });
});

