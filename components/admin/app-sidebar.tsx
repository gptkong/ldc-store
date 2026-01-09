"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  CreditCard,
  ShoppingCart,
  FolderTree,
  Users,
  Settings,
  Activity,
  LogOut,
  Store,
  ChevronUp,
  Command,
  User,
  Megaphone,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const mainNavItems = [
  {
    title: "仪表盘",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "商品管理",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "分类管理",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    title: "卡密管理",
    href: "/admin/cards",
    icon: CreditCard,
  },
  {
    title: "订单管理",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "顾客管理",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "公告管理",
    href: "/admin/announcements",
    icon: Megaphone,
  },
];

const settingsNavItems = [
  {
    title: "系统状态",
    href: "/admin/settings",
    icon: Activity,
  },
  {
    title: "系统配置",
    href: "/admin/system-config",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  // 为什么这样做：后台路由多为动态 Server Component，主动 prefetch 能把等待从“点击后”前移到“悬停时”，降低体感延迟。
  const router = useRouter();
  const { data: session } = useSession();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">LDC Store</span>
                  <span className="truncate text-xs text-muted-foreground">
                    管理后台
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>主要功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link
                      href={item.href}
                      onMouseEnter={() => router.prefetch(item.href)}
                      onFocus={() => router.prefetch(item.href)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>系统</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link
                      href={item.href}
                      onMouseEnter={() => router.prefetch(item.href)}
                      onFocus={() => router.prefetch(item.href)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all hover:bg-sidebar-accent/80"
                >
                  <Avatar className="h-8 w-8 rounded-lg ring-2 ring-sidebar-border">
                    <AvatarImage
                      src={session?.user?.image || ""}
                      alt={session?.user?.name || ""}
                    />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {session?.user?.name || "管理员"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        在线
                      </span>
                    </div>
                  </div>
                  <ChevronUp className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-xl p-2"
                side="top"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Avatar className="h-10 w-10 rounded-lg ring-2 ring-border">
                      <AvatarImage
                        src={session?.user?.image || ""}
                        alt={session?.user?.name || ""}
                      />
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                        <User className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {session?.user?.name || "管理员"}
                        </span>
                        <Badge variant="secondary" className="h-5 text-[10px] font-medium">
                          管理员
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {session?.user?.email || "admin@example.com"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link
                      href="/"
                      target="_blank"
                      className="flex items-center gap-2"
                    >
                      <Store className="size-4" />
                      <span>访问前台</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href="/admin/settings" className="flex items-center gap-2">
                      <Activity className="size-4" />
                      <span>系统状态</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href="/admin/system-config" className="flex items-center gap-2">
                      <Settings className="size-4" />
                      <span>系统配置</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                  className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950"
                >
                  <LogOut className="size-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
