import type { CardStatus } from "@/lib/db";

export const DEFAULT_ADMIN_CARDS_PAGE_SIZE = 50;

export function buildAdminCardsHref(input: {
  productId?: string;
  q?: string;
  status?: CardStatus;
  orderNo?: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
  productName?: string;
}): string {
  const params = new URLSearchParams();
  if (input.productId) params.set("product", input.productId);
  if (input.q) params.set("q", input.q);
  if (input.status) params.set("status", input.status);
  if (input.orderNo) params.set("orderNo", input.orderNo);
  if (input.pageSize && input.pageSize !== DEFAULT_ADMIN_CARDS_PAGE_SIZE) {
    params.set("pageSize", String(input.pageSize));
  }
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.categoryId) params.set("categoryId", input.categoryId);
  if (input.productName) params.set("productName", input.productName);
  const queryString = params.toString();
  return queryString ? `/admin/cards?${queryString}` : "/admin/cards";
}

