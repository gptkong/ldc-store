export const dynamic = "force-dynamic";

import { db, products, cards } from "@/lib/db";
import { eq, sql, desc, asc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImportCardsDialog } from "./import-cards-dialog";
import { EditCardDialog } from "./edit-card-dialog";
import { LocalTime } from "@/components/time/local-time";

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

interface CardsPageProps {
  searchParams: Promise<{ product?: string }>;
}

async function getProductsWithStock() {
  const productList = await db.query.products.findMany({
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

async function getCardsByProduct(productId: string) {
  return db.query.cards.findMany({
    where: eq(cards.productId, productId),
    orderBy: [asc(cards.status), desc(cards.createdAt)],
    limit: 100,
  });
}

const statusConfig: Record<string, { label: string; color: string }> = {
  available: {
    label: "可用",
    color: "bg-emerald-100 text-emerald-700",
  },
  locked: {
    label: "锁定",
    color: "bg-amber-100 text-amber-700",
  },
  sold: {
    label: "已售",
    color: "bg-zinc-100 text-zinc-700",
  },
};

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const { product: selectedProductId } = await searchParams;
  const productsWithStock = await getProductsWithStock();
  const cardsList = selectedProductId
    ? await getCardsByProduct(selectedProductId)
    : [];

  const selectedProduct = selectedProductId
    ? productsWithStock.find((p) => p.id === selectedProductId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            卡密管理
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            管理商品库存和卡密
          </p>
        </div>
        {selectedProductId && (
          <ImportCardsDialog productId={selectedProductId} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5" />
              选择商品
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {productsWithStock.map((product) => (
              <Link
                key={product.id}
                href={`/admin/cards?product=${product.id}`}
                className={`block rounded-lg border p-3 transition-colors ${
                  selectedProductId === product.id
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                    {product.name}
                  </span>
                  <Badge
                    variant={
                      product.stockStats.available === 0
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {product.stockStats.available}
                  </Badge>
                </div>
                <div className="mt-1 flex gap-2 text-xs text-zinc-500">
                  <span>已售 {product.stockStats.sold}</span>
                  {product.stockStats.locked > 0 && (
                    <span>锁定 {product.stockStats.locked}</span>
                  )}
                </div>
              </Link>
            ))}

            {productsWithStock.length === 0 && (
              <div className="py-8 text-center text-zinc-500">
                <Package className="mx-auto h-10 w-10 text-zinc-300" />
                <p className="mt-2">暂无商品</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5" />
              {selectedProduct ? `${selectedProduct.name} 的卡密` : "卡密列表"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedProductId ? (
              cardsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>卡密内容</TableHead>
                        <TableHead className="text-center">状态</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead className="text-center w-20">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cardsList.map((card) => {
                        const status = statusConfig[card.status];
                        return (
                          <TableRow key={card.id}>
                            <TableCell className="font-mono text-sm max-w-[300px] truncate">
                              {card.status === "sold" ? (
                                <span className="text-zinc-400">
                                  {card.content.slice(0, 10)}***
                                </span>
                              ) : (
                                card.content
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={status.color}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-zinc-500">
                              <LocalTime value={toIsoString(card.createdAt)} />
                            </TableCell>
                            <TableCell className="text-center">
                              <EditCardDialog
                                cardId={card.id}
                                currentContent={card.content}
                                disabled={card.status === "sold"}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <CreditCard className="mx-auto h-12 w-12 text-zinc-300" />
                  <p className="mt-4 text-zinc-500">该商品暂无卡密</p>
                  <ImportCardsDialog productId={selectedProductId}>
                    <Button className="mt-4">导入卡密</Button>
                  </ImportCardsDialog>
                </div>
              )
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

