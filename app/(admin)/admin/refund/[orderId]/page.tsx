"use client";

import { useEffect, useState, use } from "react";
import { getClientRefundData, markOrderRefunded } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default function RefundPage({ params }: PageProps) {
  const { orderId } = use(params);
  const [status, setStatus] = useState<"loading" | "submitting" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [refundData, setRefundData] = useState<{
    apiUrl: string;
    pid: string;
    key: string;
    trade_no: string;
    money: string;
  } | null>(null);

  useEffect(() => {
    // 获取退款参数
    getClientRefundData(orderId).then((result) => {
      if (result.success && result.data) {
        setRefundData(result.data);
        setStatus("submitting");
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    });
  }, [orderId]);

  useEffect(() => {
    // 自动提交表单
    if (status === "submitting" && refundData) {
      const form = document.getElementById("refund-form") as HTMLFormElement;
      if (form) {
        // 短暂延迟后提交，确保表单已渲染
        setTimeout(() => {
          form.submit();
        }, 500);
      }
    }
  }, [status, refundData]);

  const handleConfirmSuccess = async () => {
    setStatus("loading");
    const result = await markOrderRefunded(orderId, "客户端表单提交退款成功");
    if (result.success) {
      setStatus("success");
      setMessage("订单状态已更新为已退款");
      // 通知父窗口刷新
      if (window.opener) {
        window.opener.postMessage({ type: "refund_success", orderId }, "*");
      }
    } else {
      setStatus("error");
      setMessage(result.message);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p>正在加载退款信息...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error" && !refundData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              退款失败
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{message}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回订单列表
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              退款成功
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{message}</p>
            <Button asChild className="w-full">
              <Link href="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回订单列表
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // submitting 状态 - 显示表单和说明
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>正在提交退款请求</CardTitle>
          <CardDescription>
            表单将自动提交到支付平台，请查看下方响应结果
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 隐藏表单，自动提交 */}
          {refundData && (
            <form
              id="refund-form"
              method="POST"
              action={refundData.apiUrl}
              target="refund-result"
              className="hidden"
            >
              <input type="hidden" name="pid" value={refundData.pid} />
              <input type="hidden" name="key" value={refundData.key} />
              <input type="hidden" name="trade_no" value={refundData.trade_no} />
              <input type="hidden" name="money" value={refundData.money} />
            </form>
          )}

          {/* 显示结果的 iframe */}
          <div className="space-y-2">
            <p className="text-sm font-medium">支付平台响应：</p>
            <div className="rounded-lg border bg-muted/50 p-1">
              <iframe
                name="refund-result"
                className="h-40 w-full rounded bg-white dark:bg-zinc-900"
                title="退款结果"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              如果显示 {`{"code":1,"msg":"退款成功"}`} 表示退款成功
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium">请根据上方响应结果选择操作：</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                <li>如果显示 "code":1 表示退款成功，点击下方绿色按钮</li>
                <li>如果显示错误或被 CF 拦截，点击红色按钮</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                asChild
              >
                <Link href="/admin/orders">
                  <XCircle className="mr-2 h-4 w-4" />
                  退款失败
                </Link>
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleConfirmSuccess}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                退款成功
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

