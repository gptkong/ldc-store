"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Eye, EyeOff, Trash2, CreditCard } from "lucide-react";
import { toggleProductActive, deleteProduct } from "@/lib/actions/products";
import { toast } from "sonner";

interface ProductActionsProps {
  productId: string;
  productSlug: string;
  isActive: boolean;
}

export function ProductActions({
  productId,
  productSlug,
  isActive,
}: ProductActionsProps) {
  const [isPending, startTransition] = useTransition();

  // 为什么这样做：编辑入口在 Dropdown 内，Link 的默认预取很难在点击前触发；这里在打开菜单时提前 prefetch，减少“点编辑卡 3s”的体感。
  const router = useRouter();
  const editHref = `/admin/products/${productId}/edit`;
  const cardsHref = `/admin/cards?product=${productId}`;

  const handleToggleActive = () => {
    startTransition(async () => {
      const result = await toggleProductActive(productId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("确定要删除此商品吗？此操作不可恢复。")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) return;
        router.prefetch(editHref);
        router.prefetch(cardsHref);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={editHref}>
            <Pencil className="mr-2 h-4 w-4" />
            编辑
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={cardsHref}>
            <CreditCard className="mr-2 h-4 w-4" />
            管理卡密
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/product/${productSlug}`} target="_blank">
            <Eye className="mr-2 h-4 w-4" />
            查看商品页
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleToggleActive}>
          {isActive ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              下架
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              上架
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-rose-600 focus:text-rose-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

