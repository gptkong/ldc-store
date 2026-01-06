"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, LogOut, Package, Search, Store } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LinuxDoLogo } from "@/components/icons/linuxdo-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signIn, signOut } from "next-auth/react";
import { SearchBar } from "@/components/store/search-bar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HeaderProps {
  siteName?: string;
}

type StoreIconEasterEggVariant =
  | "default"
  | "mint"
  | "amber"
  | "pink"
  | "sky"
  | "violet"
  | "lime"
  | "cyan"
  | "rose"
  | "indigo";

const STORE_ICON_EASTER_EGG_VARIANTS: StoreIconEasterEggVariant[] = [
  "mint",
  "amber",
  "pink",
  "sky",
  "violet",
  "lime",
  "cyan",
  "rose",
  "indigo",
];

const STORE_ICON_VARIANT_STYLES: Record<StoreIconEasterEggVariant, string> = {
  default: "bg-primary/10 text-primary ring-border/50",
  mint: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-400",
  pink: "bg-pink-500/15 text-pink-800 ring-pink-500/30 dark:text-pink-400",
  sky: "bg-sky-500/15 text-sky-800 ring-sky-500/30 dark:text-sky-400",
  violet: "bg-violet-500/15 text-violet-800 ring-violet-500/30 dark:text-violet-400",
  lime: "bg-lime-500/15 text-lime-800 ring-lime-500/30 dark:text-lime-400",
  cyan: "bg-cyan-500/15 text-cyan-800 ring-cyan-500/30 dark:text-cyan-400",
  rose: "bg-rose-500/15 text-rose-800 ring-rose-500/30 dark:text-rose-400",
  indigo: "bg-indigo-500/15 text-indigo-800 ring-indigo-500/30 dark:text-indigo-400",
};

export function Header({ siteName = "LDC Store" }: HeaderProps) {
  const { data: session, status } = useSession();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [storeIconEasterEggKey, setStoreIconEasterEggKey] = useState(0);
  const [storeIconVariant, setStoreIconVariant] =
    useState<StoreIconEasterEggVariant>("default");
  const storeIconResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // 检查是否是 Linux DO 登录用户
  const user = session?.user as { 
    name?: string; 
    image?: string; 
    username?: string; 
    provider?: string;
    role?: string;
  } | undefined;
  const isLoggedIn = user?.provider === "linux-do";
  const isAdmin = user?.role === "admin";

  const handleLogin = () => {
    signIn("linux-do");
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const triggerStoreIconEasterEgg = () => {
    // CSS animation 在 class 不变时可能不会重新播放；通过 key 强制重挂载来稳定触发“抖动彩蛋”
    setStoreIconEasterEggKey((prev) => prev + 1);

    setStoreIconVariant((current) => {
      const variants = STORE_ICON_EASTER_EGG_VARIANTS;
      if (variants.length === 0) return "default";
      const randomIndex = Math.floor(Math.random() * variants.length);
      const picked = variants[randomIndex];
      // 尽量避免连续两次同色，提升“彩蛋变化”的观感
      if (picked === current && variants.length > 1) {
        return variants[(randomIndex + 1) % variants.length];
      }
      return picked;
    });

    // 彩蛋应该是“短暂反馈”而不是“状态”，自动回到默认样式避免误解
    if (storeIconResetTimerRef.current) {
      clearTimeout(storeIconResetTimerRef.current);
    }
    storeIconResetTimerRef.current = setTimeout(() => {
      setStoreIconVariant("default");
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (storeIconResetTimerRef.current) {
        clearTimeout(storeIconResetTimerRef.current);
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        {/* 左侧标题需要可收缩：移动端空间有限，必须允许截断，避免把右侧操作区挤出屏幕 */}
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
          <span
            key={storeIconEasterEggKey}
            onClick={triggerStoreIconEasterEgg}
            className={[
              "inline-flex size-8 items-center justify-center rounded-md ring-1 transition-colors",
              storeIconEasterEggKey > 0 ? "animate-ldc-store-shake" : "",
              STORE_ICON_VARIANT_STYLES[storeIconVariant],
            ]
              .filter(Boolean)
              .join(" ")}
            title="点我一下"
          >
            <Store className="h-4 w-4" />
          </span>
          <span className="min-w-0 truncate max-w-[45vw] sm:max-w-none">{siteName}</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* 桌面端搜索框 */}
          <div className="hidden md:block w-72">
            {/* SearchBar 内部使用 useSearchParams，静态预渲染时会触发 CSR bailout；必须包在 Suspense 里避免 build 失败。 */}
            <Suspense
              fallback={<div className="h-9 w-full rounded-md bg-muted/60 animate-pulse" />}
            >
              <SearchBar />
            </Suspense>
          </div>

          {/* 移动端搜索入口 */}
          <Popover open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="搜索">
                <Search className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-sm p-3">
              <Suspense fallback={<div className="h-9 w-full rounded-md bg-muted/60 animate-pulse" />}>
                <SearchBar
                  autoFocus
                  onAfterSubmit={() => setMobileSearchOpen(false)}
                />
              </Suspense>
            </PopoverContent>
          </Popover>

          <ThemeToggle />
          
          {/* 用户状态 */}
          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image || undefined} alt={user?.name || ""} />
                    <AvatarFallback>
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name || user?.username}</p>
                  <p className="text-xs text-muted-foreground">@{user?.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/order/my" className="cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    我的订单
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      管理后台
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {/* 移动端用 icon 按钮：避免 Header 右侧溢出，且点击目标仍足够大 */}
              <Button
                variant="outline"
                size="icon-sm"
                className="sm:hidden rounded-full"
                onClick={handleLogin}
                aria-label="Linux DO Connect 登录"
              >
                <LinuxDoLogo className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={handleLogin}
              >
                <LinuxDoLogo className="mr-2 h-4 w-4" />
                Linux DO Connect
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
