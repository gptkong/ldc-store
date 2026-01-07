"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useSession, signIn } from "next-auth/react";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { requestRestock } from "@/lib/actions/restock-requests";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface RestockRequestInlineRequester {
  userId: string;
  username: string;
  userImage?: string | null;
}

interface RestockRequestInlineProps {
  productId: string;
  productName: string;
  initialCount?: number;
  initialRequesters?: RestockRequestInlineRequester[];
  maxAvatars?: number;
  className?: string;
  size?: "sm" | "md";
}

function storageKey(productId: string): string {
  return `restock_requested:${productId}`;
}

const RESTOCK_LOCAL_EVENT = "restock:requested";

function subscribeRestockLocalEvent(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  // 关键：localStorage 在同一 tab 内 setItem 不会触发 "storage" 事件
  // 所以我们额外派发一个自定义事件，用于让 UI 立即感知“已催”状态变化。
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(RESTOCK_LOCAL_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(RESTOCK_LOCAL_EVENT, handler);
  };
}

function readRestockRequestedFromStorage(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function useRestockRequested(productId: string): boolean {
  const key = storageKey(productId);
  return useSyncExternalStore(
    subscribeRestockLocalEvent,
    () => readRestockRequestedFromStorage(key),
    // 关键：SSR/ISR 统一返回 false，避免 hydration mismatch
    () => false
  );
}

export function RestockRequestInline({
  productId,
  productName,
  initialCount = 0,
  initialRequesters = [],
  maxAvatars = 4,
  className,
  size = "sm",
}: RestockRequestInlineProps) {
  const [isPending, startTransition] = useTransition();
  const { data: session, status } = useSession();

  const [count, setCount] = useState<number>(initialCount);
  const [requesters, setRequesters] = useState<RestockRequestInlineRequester[]>(initialRequesters);
  const requestedByMe = useRestockRequested(productId);

  const user = session?.user as
    | { id?: string; username?: string; name?: string; image?: string; provider?: string }
    | undefined;
  const isLoggedIn = user?.provider === "linux-do";

  const displayedRequesters = useMemo(() => {
    return requesters.slice(0, Math.max(1, maxAvatars));
  }, [requesters, maxAvatars]);

  const remainingCount = Math.max(0, count - displayedRequesters.length);

  const avatarSizeClassName = size === "md" ? "size-7" : "size-6";
  const textClassName = size === "md" ? "text-sm" : "text-xs";

  const handleRequest = () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再催补货");
      signIn("linux-do");
      return;
    }

    startTransition(async () => {
      const result = await requestRestock(productId);
      if (!result.success) {
        toast.error("催补货失败", { description: result.message });
        return;
      }

      toast.success(result.message);

      // 使用服务端回包作为“最终态”，避免前端自增导致的并发偏差
      if (result.summary) {
        setCount(result.summary.count);
        setRequesters(result.summary.requesters);
      } else {
        // 极端兜底：如果没有 summary，就做一次乐观自增（体验优先）
        setCount((prev) => prev + 1);
      }

      try {
        localStorage.setItem(storageKey(productId), "1");
        window.dispatchEvent(new Event(RESTOCK_LOCAL_EVENT));
      } catch {
        // ignore
      }
    });
  };

  const buttonLabel = (() => {
    if (status === "loading") return "加载中";
    if (!isLoggedIn) return "登录后催补货";
    if (requestedByMe) return "已催补货";
    return "催补货";
  })();

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="flex min-w-0 flex-col items-start gap-1">
        {count > 0 ? (
          <>
            <div className="flex items-center -space-x-2">
              {displayedRequesters.map((u) => (
                <Avatar
                  key={u.userId}
                  className={cn(
                    // 关键：显式 z-index，确保「+N」始终在最顶层（避免不同浏览器/渲染路径出现叠放差异）
                    "z-0 ring-2 ring-background",
                    avatarSizeClassName
                  )}
                >
                  <AvatarImage src={u.userImage ?? undefined} alt={`${u.username} 的头像`} />
                  <AvatarFallback className="text-[10px] font-semibold text-muted-foreground">
                    {(u.username || "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {remainingCount > 0 ? (
                <div
                  className={cn(
                    // 关键：+N 代表“更多”，应该压在最上层，避免被头像遮挡
                    "relative z-10 flex items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background",
                    avatarSizeClassName
                  )}
                  aria-label={`还有 ${remainingCount} 人已催补货`}
                >
                  +{remainingCount}
                </div>
              ) : null}
            </div>

            <div className={cn("tabular-nums text-muted-foreground", textClassName)}>
              {count} 人已催
            </div>
          </>
        ) : (
          <div className={cn("tabular-nums text-muted-foreground", textClassName)}>
            还没人催
          </div>
        )}
      </div>

      <Button
        type="button"
        size={size === "md" ? "default" : "sm"}
        variant={requestedByMe ? "secondary" : "default"}
        className={cn(
          "shrink-0 rounded-full",
          size === "md" ? "h-9" : "h-8"
        )}
        onClick={handleRequest}
        disabled={isPending || status === "loading"}
        aria-label={`${buttonLabel}：${productName}`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : requestedByMe ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <BellRing className="h-4 w-4" />
        )}
        <span className="max-w-[10rem] truncate">{buttonLabel}</span>
      </Button>
    </div>
  );
}
