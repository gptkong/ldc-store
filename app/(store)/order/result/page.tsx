"use client";

import { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrderByNo } from "@/lib/actions/orders";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Home,
  Copy,
  Package,
  XCircle,
  ShoppingBag,
} from "lucide-react";

interface OrderResultPageProps {
  searchParams: Promise<{ out_trade_no?: string }>;
}

interface OrderData {
  orderNo: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  cards: string[];
}

export default function OrderResultPage({ searchParams }: OrderResultPageProps) {
  const params = use(searchParams);
  const { data: session, status: sessionStatus } = useSession();
  const [orderNo, setOrderNo] = useState(params.out_trade_no || "");

  const [isPending, startTransition] = useTransition();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 检查是否是 Linux DO 登录用户
  const user = session?.user as { provider?: string } | undefined;
  const isLoggedIn = user?.provider === "linux-do";

  // 如果 URL 没有订单号参数，尝试从 localStorage 读取
  useEffect(() => {
    if (!params.out_trade_no) {
      const savedOrderNo = localStorage.getItem("ldc_last_order_no");
      if (savedOrderNo) {
        setOrderNo(savedOrderNo);
        localStorage.removeItem("ldc_last_order_no");
      }
    }
  }, [params.out_trade_no]);

  // 加载订单数据
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!orderNo) {
      setIsLoading(false);
      return;
    }

    if (!isLoggedIn) {
      setError("请先登录查看订单");
      setIsLoading(false);
      return;
    }

    loadOrder();
  }, [sessionStatus, orderNo, isLoggedIn]);

  const loadOrder = () => {
    startTransition(async () => {
      const result = await getOrderByNo(orderNo);
      if (result.success && result.data) {
        setOrder(result.data as OrderData);
      } else {
        setError(result.message || "获取订单失败");
      }
      setIsLoading(false);
    });
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("已复制");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  // 加载中
  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">加载中...</p>
      </div>
    );
  }

  // 未登录
  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">请先登录查看订单</p>
        <Link href="/">
          <Button className="mt-4">返回首页</Button>
        </Link>
      </div>
    );
  }

  // 订单号无效
  if (!orderNo) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">订单号无效</p>
        <Link href="/">
          <Button className="mt-4">返回首页</Button>
        </Link>
      </div>
    );
  }

  // 订单不存在或无权限
  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">{error}</p>
        <div className="mt-4 flex gap-3 justify-center">
          <Link href="/order/my">
            <Button variant="outline">
              <ShoppingBag className="mr-2 h-4 w-4" />
              我的订单
            </Button>
          </Link>
          <Link href="/">
            <Button>返回首页</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 加载订单中
  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">加载订单中...</p>
      </div>
    );
  }

  // 已查询 - 显示订单详情
  const isPaid = order.status === "paid" || order.status === "completed";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Status */}
          <div className="text-center">
            {isPaid ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            ) : order.status === "pending" ? (
              <Clock className="mx-auto h-12 w-12 text-amber-500" />
            ) : (
              <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            )}
            <h1 className="mt-4 text-xl font-semibold">{order.productName}</h1>
            <Badge
              variant={isPaid ? "default" : "secondary"}
              className="mt-2"
            >
              {order.status === "pending" && "待支付"}
              {order.status === "paid" && "已支付"}
              {order.status === "completed" && "已完成"}
              {order.status === "expired" && "已过期"}
              {order.status === "refunded" && "已退款"}
            </Badge>
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">订单号</span>
              <p className="font-mono">{order.orderNo}</p>
            </div>
            <div>
              <span className="text-muted-foreground">金额</span>
              <p className="font-semibold">{order.totalAmount} LDC</p>
            </div>
            <div>
              <span className="text-muted-foreground">数量</span>
              <p>{order.quantity} 件</p>
            </div>
            <div>
              <span className="text-muted-foreground">下单时间</span>
              <p>{new Date(order.createdAt).toLocaleString("zh-CN")}</p>
            </div>
          </div>

          {/* Cards */}
          {order.cards && order.cards.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                <Package className="h-4 w-4" />
                卡密信息 ({order.cards.length} 个)
              </div>
              <div className="space-y-2">
                {order.cards.map((card, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 rounded bg-white p-2 dark:bg-zinc-900"
                  >
                    <code className="text-sm font-mono break-all flex-1">
                      {card}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(card, index)}
                    >
                      {copiedIndex === index ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Notice */}
          {order.status === "pending" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <Clock className="inline h-4 w-4 mr-1" />
              订单待支付，请尽快完成支付
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/order/my" className="flex-1">
              <Button variant="outline" className="w-full">
                <ShoppingBag className="mr-2 h-4 w-4" />
                我的订单
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="ghost" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                首页
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
