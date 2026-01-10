"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { buildAdminCardsHref } from "./cards-url";

interface ProductWithStock {
  id: string;
  name: string;
  categoryId: string | null;
  stockStats: { available: number; sold: number; locked: number };
}

interface Category {
  id: string;
  name: string;
}

export function ProductSelector({
  products,
  categories,
  selectedProductId,
  categoryId,
  productName,
}: {
  products: ProductWithStock[];
  categories: Category[];
  selectedProductId?: string;
  categoryId?: string;
  productName?: string;
}) {
  const router = useRouter();
  const [localName, setLocalName] = useState(productName || "");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false;
      if (localName && !product.name.toLowerCase().includes(localName.toLowerCase())) return false;
      return true;
    });
  }, [products, categoryId, localName]);

  const handleCategoryChange = (value: string) => {
    router.push(buildAdminCardsHref({
      categoryId: value === "all" ? undefined : value,
      productName: localName || undefined,
    }));
  };

  return (
    <div className="space-y-3">
      <Select value={categoryId || "all"} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="全部分类" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部分类</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索商品名称"
          className="pl-8"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
        />
      </div>

      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
        {filteredProducts.map((product) => (
          <Link
            key={product.id}
            href={buildAdminCardsHref({ productId: product.id, categoryId, productName })}
            className={`block rounded-lg border p-3 transition-colors ${
              selectedProductId === product.id
                ? "border-violet-500 bg-violet-50 dark:bg-violet-950"
                : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                {product.name}
              </span>
              <Badge
                variant={product.stockStats.available === 0 ? "destructive" : "secondary"}
              >
                {product.stockStats.available}
              </Badge>
            </div>
            <div className="mt-1 flex gap-2 text-xs text-zinc-500">
              <span>已售 {product.stockStats.sold}</span>
              {product.stockStats.locked > 0 && (
                <span>锁定 {product.stockStats.locked}</span>
              )}
            </div>
          </Link>
        ))}

        {filteredProducts.length === 0 && (
          <div className="py-8 text-center text-zinc-500">
            <Package className="mx-auto h-10 w-10 text-zinc-300" />
            <p className="mt-2">{products.length === 0 ? "暂无商品" : "没有匹配的商品"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
