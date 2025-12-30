"use client";

import Link from "next/link";
import { User, LogOut, Package } from "lucide-react";
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

interface HeaderProps {
  siteName?: string;
}

export function Header({ siteName = "LDC Store" }: HeaderProps) {
  const { data: session, status } = useSession();

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

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          {siteName}
        </Link>

        <div className="flex items-center gap-3">
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
            <Button variant="outline" size="sm" onClick={handleLogin}>
              <LinuxDoLogo className="mr-2 h-4 w-4" />
              Linux DO Connect
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
