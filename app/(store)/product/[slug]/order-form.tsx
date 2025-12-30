"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession, signIn } from "next-auth/react";
import { createOrder } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Minus, Plus, CheckCircle2 } from "lucide-react";
import { LinuxDoLogo } from "@/components/icons/linuxdo-logo";

const orderFormSchema = z.object({
  quantity: z.number().int().min(1),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  productId: string;
  productName: string;
  price: number;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
}

export function OrderForm({
  productId,
  productName,
  price,
  stock,
  minQuantity,
  maxQuantity,
}: OrderFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session, status } = useSession();
  const effectiveMax = Math.min(maxQuantity, stock);

  // 检查是否是 Linux DO 登录用户
  const user = session?.user as { username?: string; provider?: string } | undefined;
  const isLoggedIn = user?.provider === "linux-do";

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      quantity: minQuantity,
    },
  });

  const quantity = form.watch("quantity");
  const totalPrice = (price * quantity).toFixed(2);

  const updateQuantity = (delta: number) => {
    const newValue = quantity + delta;
    if (newValue >= minQuantity && newValue <= effectiveMax) {
      form.setValue("quantity", newValue);
    }
  };

  const handleLogin = () => {
    signIn("linux-do");
  };

  const onSubmit = (values: OrderFormValues) => {
    if (!isLoggedIn) {
      toast.error("请先登录");
      return;
    }

    startTransition(async () => {
      const result = await createOrder({
        productId,
        quantity: values.quantity,
        paymentMethod: "ldc",
      });

      if (result.success) {
        toast.success("订单创建成功", {
          description: `订单号: ${result.orderNo}`,
        });

        // 保存订单号到 localStorage，用于支付完成后回调页面读取
        localStorage.setItem("ldc_last_order_no", result.orderNo!);

        if (result.paymentForm) {
          const form = document.createElement("form");
          form.method = "POST";
          form.action = result.paymentForm.actionUrl;
          form.style.display = "none";

          Object.entries(result.paymentForm.params).forEach(([key, value]) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = value;
            form.appendChild(input);
          });

          document.body.appendChild(form);
          form.submit();
        } else {
          router.push(`/order/result?out_trade_no=${result.orderNo}`);
        }
      } else {
        toast.error("下单失败", {
          description: result.message,
        });
      }
    });
  };

  // 加载中
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 未登录提示
  if (!isLoggedIn) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            请登录后购买商品
          </p>
        </div>
        <Button onClick={handleLogin} className="w-full">
          <LinuxDoLogo className="mr-2 h-4 w-4" />
          Linux DO Connect
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* 登录用户提示 */}
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span>
          已登录为 <strong>{user?.username}</strong>，支付完成后可在「我的订单」查看卡密
        </span>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label>数量</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => updateQuantity(-1)}
              disabled={quantity <= minQuantity}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              className="h-9 w-14 border-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= minQuantity && val <= effectiveMax) {
                  form.setValue("quantity", val);
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => updateQuantity(1)}
              disabled={quantity >= effectiveMax}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            限购 {minQuantity}-{effectiveMax} 件
          </span>
        </div>
      </div>

      {/* Total & Submit */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <span className="text-sm text-muted-foreground">{productName} × {quantity}</span>
          <div className="text-xl font-bold">{totalPrice} LDC</div>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              处理中
            </>
          ) : (
            "立即购买"
          )}
        </Button>
      </div>
    </form>
  );
}
