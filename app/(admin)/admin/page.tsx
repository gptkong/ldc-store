export const dynamic = "force-dynamic";

import { db, orders, cards, products } from "@/lib/db";
import { eq, sql, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getStatsTimeZone, getTodayRangeSql } from "@/lib/time/stats";

async function getDashboardStats() {
  // 今日销售统计（统计口径由 STATS_TIMEZONE 控制，默认 Asia/Shanghai）
  const statsTimeZone = getStatsTimeZone();
  const { start: todayStart, end: tomorrowStart } = getTodayRangeSql(statsTimeZone);

  const todaySales = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`COALESCE(sum(total_amount::numeric), 0)::text`,
    })
    .from(orders)
    .where(and(
      eq(orders.status, "completed"),
      sql`${orders.paidAt} >= ${todayStart} AND ${orders.paidAt} < ${tomorrowStart}`
    ));

  // 待处理订单
  const pendingOrders = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.status, "pending"));

  // 库存预警（可用库存少于 10 的商品）
  const lowStockProducts = await db.execute(sql`
    SELECT p.id, p.name, COUNT(c.id)::int as stock
    FROM products p
    LEFT JOIN cards c ON c.product_id = p.id AND c.status = 'available'
    WHERE p.is_active = true
    GROUP BY p.id, p.name
    HAVING COUNT(c.id) < 10
    ORDER BY COUNT(c.id) ASC
    LIMIT 5
  `);

  // 最近订单
  const recentOrders = await db.query.orders.findMany({
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    limit: 5,
    with: {
      product: {
        columns: {
          name: true,
        },
      },
    },
  });

  // 总商品数
  const totalProducts = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.isActive, true));

  // 总库存
  const totalStock = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cards)
    .where(eq(cards.status, "available"));

  return {
    todaySales: {
      count: todaySales[0]?.count || 0,
      total: parseFloat(todaySales[0]?.total || "0").toFixed(2),
    },
    pendingOrderCount: pendingOrders[0]?.count || 0,
    lowStockProducts:
      (lowStockProducts as unknown as Array<{
        id: string;
        name: string;
        stock: number;
      }>) || [],
    recentOrders,
    totalProducts: totalProducts[0]?.count || 0,
    totalStock: totalStock[0]?.count || 0,
  };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: {
    label: "待支付",
    variant: "outline",
  },
  paid: {
    label: "已支付",
    variant: "secondary",
  },
  completed: {
    label: "已完成",
    variant: "default",
  },
  expired: {
    label: "已过期",
    variant: "secondary",
  },
  refund_pending: {
    label: "待退款",
    variant: "destructive",
  },
  refund_rejected: {
    label: "退款已拒绝",
    variant: "outline",
  },
  refunded: {
    label: "已退款",
    variant: "destructive",
  },
};

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
          <p className="text-muted-foreground">
            欢迎回来，这是今日的运营数据概览
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Activity className="h-3 w-3 text-emerald-500" />
            系统正常
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日销售额</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySales.total} LDC</div>
            <p className="text-xs text-muted-foreground">
              今日完成订单金额
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日订单</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySales.count}</div>
            <p className="text-xs text-muted-foreground">
              今日完成订单数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理订单</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrderCount}</div>
            <p className="text-xs text-muted-foreground">
              等待支付的订单
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总库存</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProducts} 个商品
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base font-semibold">库存预警</CardTitle>
            </div>
            <Link href="/admin/cards">
              <Button variant="ghost" size="sm">
                管理卡密
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.lowStockProducts?.length > 0 ? (
              <div className="space-y-3">
                {stats.lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm font-medium">{product.name}</span>
                    <Badge
                      variant={product.stock === 0 ? "destructive" : "secondary"}
                    >
                      库存: {product.stock}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  所有商品库存充足
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-500" />
              <CardTitle className="text-base font-semibold">最近订单</CardTitle>
            </div>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">
                查看全部
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentOrders?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => {
                  const status =
                    statusConfig[order.status] || statusConfig.pending;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-medium">
                          {order.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.orderNo} · {order.totalAmount} LDC
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">暂无订单</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
