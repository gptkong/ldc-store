export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { isRefundEnabled, getRefundMode } from "@/lib/payment/ldc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Eye, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { OrderActions } from "./order-actions";
import { LocalTime } from "@/components/time/local-time";

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function getOrders() {
  return db.query.orders.findMany({
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    limit: 100,
    with: {
      product: {
        columns: {
          name: true,
        },
      },
    },
  });
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: {
    label: "待支付",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  paid: {
    label: "已支付",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  completed: {
    label: "已完成",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  expired: {
    label: "已过期",
    color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  refund_pending: {
    label: "退款审核中",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  },
  refund_rejected: {
    label: "退款已拒绝",
    color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  refunded: {
    label: "已退款",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  },
};

const paymentMethodLabels: Record<string, string> = {
  ldc: "LDC 积分",
  alipay: "支付宝",
  wechat: "微信",
  usdt: "USDT",
};

export default async function OrdersPage() {
  const orders = await getOrders();
  const refundEnabled = isRefundEnabled();
  const refundMode = getRefundMode();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          订单管理
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          查看和管理所有订单
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "pending").length}
                </p>
                <p className="text-sm text-zinc-500">待支付</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "completed").length}
                </p>
                <p className="text-sm text-zinc-500">已完成</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                <RotateCcw className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "refund_pending").length}
                </p>
                <p className="text-sm text-zinc-500">待审核退款</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-5 w-5" />
            订单列表 ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead className="text-center">数量</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead>支付方式</TableHead>
                    <TableHead>联系邮箱</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const status = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.orderNo}
                        </TableCell>
                        <TableCell>
                          <span className="max-w-[200px] truncate block">
                            {order.productName}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {order.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {order.totalAmount} LDC
                        </TableCell>
                        <TableCell>
                          {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {order.email}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">
                          <LocalTime value={toIsoString(order.createdAt)} mode="short" />
                        </TableCell>
                        <TableCell className="text-right">
                          <OrderActions
                            orderId={order.id}
                            orderNo={order.orderNo}
                            status={order.status}
                            refundReason={order.refundReason}
                            refundEnabled={refundEnabled}
                            refundMode={refundMode}
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
              <ShoppingCart className="mx-auto h-12 w-12 text-zinc-300" />
              <p className="mt-4 text-zinc-500">暂无订单</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

