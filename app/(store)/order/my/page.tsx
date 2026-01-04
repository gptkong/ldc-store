"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getUserOrders } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
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
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatShortTime } from "@/lib/time";

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
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; className?: string }
> = {
  pending: {
    label: "待支付",
    variant: "outline",
    icon: <Clock className="h-3 w-3" />,
  },
  paid: {
    label: "已支付",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  completed: {
    label: "已完成",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-green-600 hover:bg-green-600/90",
  },
  expired: {
    label: "已过期",
    variant: "secondary",
    icon: <XCircle className="h-3 w-3" />,
  },
  refunded: {
    label: "已退款",
    variant: "destructive",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export default function MyOrdersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState<string | null>(null);

  const user = session?.user as { provider?: string } | undefined;
  const isLoggedIn = user?.provider === "linux-do";

  const loadOrders = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await getUserOrders();
      if (result.success) {
        setOrders(result.data as OrderData[]);
      } else {
        toast.error(result.message || "获取订单失败");
      }
    } catch {
      toast.error("获取订单失败");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!isLoggedIn) {
      router.push("/");
      return;
    }

    loadOrders();
  }, [sessionStatus, isLoggedIn, router, loadOrders]);

  const copyToClipboard = async (text: string, cardId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCard(cardId);
      toast.success("已复制");
      setTimeout(() => setCopiedCard(null), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  const copyAllCards = async (cards: string[]) => {
    try {
      await navigator.clipboard.writeText(cards.join("\n"));
      toast.success(`已复制 ${cards.length} 张卡密`);
    } catch {
      toast.error("复制失败");
    }
  };

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">我的订单</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadOrders(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Orders */}
      {orders && orders.length > 0 ? (
        <div className="divide-y border rounded-lg bg-card">
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const isExpanded = expandedOrder === order.orderNo;
            const hasCards = order.cards && order.cards.length > 0;

            return (
              <div key={order.orderNo}>
                {/* Order Row */}
                <button
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.orderNo)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{order.productName}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatShortTime(order.createdAt)}</span>
                      <span>×{order.quantity}</span>
                      <span className="font-medium text-foreground">{order.totalAmount} LDC</span>
                    </div>
                  </div>
                  <Badge variant={status.variant} className={`shrink-0 text-xs ${status.className || ""}`}>
                    {status.icon}
                    <span className="ml-1">{status.label}</span>
                  </Badge>
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t bg-muted/30">
                    <div className="py-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">订单号</span>
                        <span className="font-mono text-xs">{order.orderNo}</span>
                      </div>
                      {order.paidAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">支付时间</span>
                          <span>{new Date(order.paidAt).toLocaleString("zh-CN")}</span>
                        </div>
                      )}
                    </div>

                    {/* Cards */}
                    {hasCards && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium flex items-center gap-1.5">
                            <Package className="h-4 w-4" />
                            卡密 ({order.cards.length})
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyAllCards(order.cards);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            复制全部
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {order.cards.map((card, idx) => {
                            const cardId = `${order.orderNo}-${idx}`;
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 rounded bg-background border text-sm group"
                              >
                                <code className="flex-1 font-mono text-xs break-all select-all">
                                  {card}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(card, cardId);
                                  }}
                                >
                                  {copiedCard === cardId ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pending Notice */}
                    {order.status === "pending" && (
                      <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs">
                        订单待支付，请尽快完成支付
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-card">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">暂无订单</p>
          <Button asChild variant="outline" className="mt-4" size="sm">
            <Link href="/">去购物</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
