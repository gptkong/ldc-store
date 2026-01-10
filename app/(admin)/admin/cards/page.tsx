export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { db, products, cards, orders, categories, cardStatusEnum, type CardStatus } from "@/lib/db";
import { eq, sql, desc, asc, and, ilike, inArray } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { ImportCardsDialog } from "./import-cards-dialog";
import { CreateCardDialog } from "./create-card-dialog";
import { CardsClient } from "./cards-client";
import { ProductSelector } from "./product-selector";
import { buildAdminCardsHref, DEFAULT_ADMIN_CARDS_PAGE_SIZE } from "./cards-url";
import type { AdminCardListItem } from "./cards-table";

function normalizePage(value?: string): number {
  return Math.max(1, Number.parseInt(value || "1", 10) || 1);
}

function normalizePageSize(value?: string): number {
  const parsed = Number.parseInt(value || String(DEFAULT_ADMIN_CARDS_PAGE_SIZE), 10);
  const safe = Number.isFinite(parsed) ? parsed : DEFAULT_ADMIN_CARDS_PAGE_SIZE;
  return Math.min(200, Math.max(1, safe));
}

function normalizeEnumValue<T extends readonly string[]>(
  value: string | undefined,
  allowed: T
): T[number] | undefined {
  if (!value) return undefined;
  return allowed.includes(value) ? (value as T[number]) : undefined;
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

interface CardsPageProps {
  searchParams: Promise<{
    product?: string;
    q?: string;
    status?: string;
    orderNo?: string;
    page?: string;
    pageSize?: string;
    categoryId?: string;
    productName?: string;
  }>;
}

async function getProductsWithStock() {
  const productList = await db.query.products.findMany({
    columns: {
      id: true,
      name: true,
      sortOrder: true,
      createdAt: true,
      categoryId: true,
    },
    orderBy: [asc(products.sortOrder), desc(products.createdAt)],
  });

  const stockStats = await db
    .select({
      productId: cards.productId,
      status: cards.status,
      count: sql<number>`count(*)::int`,
    })
    .from(cards)
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

async function getCardsPage(
  productId: string,
  options: {
    q?: string;
    status?: CardStatus;
    orderNo?: string;
    page: number;
    pageSize: number;
  }
): Promise<{ items: AdminCardListItem[]; total: number }> {
  const conditions = [eq(cards.productId, productId)];

  if (options.status) {
    conditions.push(eq(cards.status, options.status));
  }

  if (options.q) {
    const pattern = `%${escapeLikePattern(options.q)}%`;
    conditions.push(ilike(cards.content, pattern));
  }

  if (options.orderNo) {
    const pattern = `%${escapeLikePattern(options.orderNo)}%`;
    const matchedOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(ilike(orders.orderNo, pattern))
      .limit(200);

    const orderIds = matchedOrders.map((o) => o.id);
    if (orderIds.length === 0) {
      return { items: [], total: 0 };
    }

    conditions.push(inArray(cards.orderId, orderIds));
  }

  const where = and(...conditions);
  const offset = (options.page - 1) * options.pageSize;

  const [rows, countRows] = await Promise.all([
    db.query.cards.findMany({
      where,
      columns: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        orderId: true,
      },
      with: {
        order: {
          columns: {
            id: true,
            orderNo: true,
          },
        },
      },
      orderBy: [asc(cards.status), desc(cards.createdAt)],
      limit: options.pageSize,
      offset,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(cards).where(where),
  ]);

  const total = countRows[0]?.count ?? 0;

  const items: AdminCardListItem[] = rows.map((card) => ({
    ...card,
    content: card.status === "sold" ? `${card.content.slice(0, 10)}***` : card.content,
    contentMasked: card.status === "sold",
  }));

  return { items, total };
}

const stockBadgeConfig: Record<CardStatus, { label: string; className: string }> = {
  available: {
    label: "可用",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  locked: {
    label: "锁定",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
  },
  sold: {
    label: "已售",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  },
};

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const params = await searchParams;
  const selectedProductId = params.product;
  const categoryId = params.categoryId;
  const productName = (params.productName || "").trim();

  const q = (params.q || "").trim();
  const orderNo = (params.orderNo || "").trim();
  const status = normalizeEnumValue(params.status, cardStatusEnum.enumValues) as
    | CardStatus
    | undefined;
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);

  const [productsWithStock, categoryList] = await Promise.all([
    getProductsWithStock(),
    db.query.categories.findMany({
      columns: { id: true, name: true },
      where: eq(categories.isActive, true),
      orderBy: [asc(categories.sortOrder)],
    }),
  ]);

  const selectedProduct = selectedProductId
    ? productsWithStock.find((p) => p.id === selectedProductId)
    : null;

  const cardsResult = selectedProductId
    ? await getCardsPage(selectedProductId, {
        q: q || undefined,
        status,
        orderNo: orderNo || undefined,
        page,
        pageSize,
      })
    : { items: [], total: 0 };

  const totalPages = Math.max(1, Math.ceil(cardsResult.total / pageSize));
  if (selectedProductId && cardsResult.total > 0 && page > totalPages) {
    redirect(
      buildAdminCardsHref({
        productId: selectedProductId,
        q: q || undefined,
        status,
        orderNo: orderNo || undefined,
        page: totalPages,
        pageSize,
      })
    );
  }
  const safePage = Math.min(page, totalPages);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            卡密管理
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            管理商品库存和卡密
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">选择商品</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSelector
              products={productsWithStock}
              categories={categoryList}
              selectedProductId={selectedProductId}
              categoryId={categoryId}
              productName={productName}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5" />
              {selectedProduct ? `${selectedProduct.name} 的卡密` : "卡密列表"}
            </CardTitle>
            {selectedProduct ? (
              <CardDescription className="flex flex-wrap gap-2">
                <Badge className={stockBadgeConfig.available.className}>
                  {stockBadgeConfig.available.label} {selectedProduct.stockStats.available}
                </Badge>
                <Badge className={stockBadgeConfig.locked.className}>
                  {stockBadgeConfig.locked.label} {selectedProduct.stockStats.locked}
                </Badge>
                <Badge className={stockBadgeConfig.sold.className}>
                  {stockBadgeConfig.sold.label} {selectedProduct.stockStats.sold}
                </Badge>
              </CardDescription>
            ) : null}
            {selectedProductId ? (
              <CardAction className="flex items-center gap-2">
                <CreateCardDialog productId={selectedProductId} />
                <ImportCardsDialog productId={selectedProductId} />
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {selectedProductId ? (
              <CardsClient
                productId={selectedProductId}
                items={cardsResult.items}
                total={cardsResult.total}
                page={safePage}
                pageSize={pageSize}
                totalPages={totalPages}
                q={q}
                status={status}
                orderNo={orderNo}
              />
            ) : (
              <div className="py-12 text-center">
                <CreditCard className="mx-auto h-12 w-12 text-zinc-300" />
                <p className="mt-4 text-zinc-500">请先选择一个商品</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
