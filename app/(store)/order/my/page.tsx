"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getUserOrders } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Package,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface OrderData {
  orderNo: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  status: string;
  paymentMethod: string;
  createdAt: Date;
  paidAt: Date | null;
  cards: string[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "待支付",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    icon: <Clock className="h-4 w-4" />,
  },
  paid: {
    label: "已支付",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  completed: {
    label: "已完成",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  expired: {
    label: "已过期",
    color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    icon: <XCircle className="h-4 w-4" />,
  },
  refunded: {
    label: "已退款",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

export default function MyOrdersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = useState<OrderData[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 检查是否是 Linux DO 登录用户
  const user = session?.user as { provider?: string } | undefined;
  const isLoggedIn = user?.provider === "linux-do";

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!isLoggedIn) {
      router.push("/");
      return;
    }

    loadOrders();
  }, [sessionStatus, isLoggedIn, router]);

  const loadOrders = () => {
    setIsLoading(true);
    startTransition(async () => {
      const result = await getUserOrders();
      if (result.success) {
        setOrders(result.data as OrderData[]);
      } else {
        toast.error(result.message || "获取订单失败");
      }
      setIsLoading(false);
    });
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600">
            <ShoppingBag className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            我的订单
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            查看您的历史订单和卡密信息
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadOrders}
          disabled={isPending}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {/* Order List */}
      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            共 {orders.length} 个订单
          </p>

          {orders.map((order, orderIndex) => {
            const status = statusConfig[order.status] || statusConfig.pending;

            return (
              <Card key={order.orderNo}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {order.productName}
                      </CardTitle>
                      <p className="mt-1 text-sm text-zinc-500">
                        订单号: {order.orderNo}
                      </p>
                    </div>
                    <Badge className={status.color}>
                      {status.icon}
                      <span className="ml-1">{status.label}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">数量</span>
                      <p className="font-medium">{order.quantity} 件</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">金额</span>
                      <p className="font-medium text-violet-600">
                        {order.totalAmount} LDC
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500">下单时间</span>
                      <p className="font-medium">
                        {new Date(order.createdAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    {order.paidAt && (
                      <div>
                        <span className="text-zinc-500">支付时间</span>
                        <p className="font-medium">
                          {new Date(order.paidAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cards */}
                  {order.cards && order.cards.length > 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <Package className="h-4 w-4" />
                        卡密信息
                      </div>
                      <div className="space-y-2">
                        {order.cards.map((card, cardIndex) => {
                          const globalIndex = orderIndex * 1000 + cardIndex;
                          return (
                            <div
                              key={cardIndex}
                              className="flex items-center justify-between rounded bg-white p-2 dark:bg-zinc-900"
                            >
                              <code className="text-sm font-mono break-all">
                                {card}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => copyToClipboard(card, globalIndex)}
                              >
                                {copiedIndex === globalIndex ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pending Payment Notice */}
                  {order.status === "pending" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        订单待支付，请尽快完成支付
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-zinc-300" />
            <p className="mt-4 text-zinc-500">暂无订单</p>
            <Button asChild className="mt-4">
              <Link href="/">去购物</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

