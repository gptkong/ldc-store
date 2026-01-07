import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Flame, Package, Sparkles, TrendingUp } from "lucide-react";
import { RestockRequestInline } from "@/components/store/restock-request-inline";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: string;
  originalPrice?: string | null;
  coverImage?: string | null;
  stock: number;
  isFeatured?: boolean;
  salesCount?: number;
  category?: {
    name: string;
    slug: string;
  } | null;
  restockRequestCount?: number;
  restockRequesters?: Array<{
    userId: string;
    username: string;
    userImage?: string | null;
  }>;
}

export function ProductCard({
  id,
  name,
  slug,
  description,
  price,
  originalPrice,
  coverImage,
  stock,
  isFeatured,
  salesCount,
  category,
  restockRequestCount = 0,
  restockRequesters = [],
}: ProductCardProps) {
  const isOutOfStock = stock === 0;
  const hasDiscount = originalPrice && parseFloat(originalPrice) > parseFloat(price);
  const discountPercent = hasDiscount
    ? Math.round((1 - parseFloat(price) / parseFloat(originalPrice)) * 100)
    : 0;

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background active:translate-y-0 active:shadow-lg motion-reduce:transform-none motion-reduce:hover:translate-y-0"
    >
      <Link
        href={`/product/${slug}`}
        aria-label={`查看商品：${name}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none"
      >
        <span className="sr-only">查看商品：{name}</span>
      </Link>

      <div className="relative z-20 flex flex-col pointer-events-none">
      {/* Cover：图像层级更“干净”，内容层与图像层用柔和分割，避免信息挤在同一层导致阅读压力 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40">
        {coverImage ? (
          <img
            src={coverImage}
            alt={name}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105 motion-safe:group-focus-within:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent blur-xl" />
              <Package className="h-12 w-12 text-muted-foreground/40" />
            </div>
          </div>
        )}

        {/* Hover/focus overlay：给触屏/键盘用户“同等反馈”，避免仅依赖 hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" />

        {/* Badges overlay */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {isFeatured && (
            <Badge className="border-0 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-white/20 gap-1">
              <Flame className="h-3 w-3 drop-shadow-sm" />
              热门
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-700 shadow-sm backdrop-blur-sm dark:text-rose-300">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Stock badge */}
        {isOutOfStock && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="pointer-events-auto w-[calc(100%-1.5rem)] max-w-[18rem] rounded-xl border bg-background/90 p-3 shadow-sm shadow-primary/10 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
                  已售罄
                </Badge>
                <span className="text-xs text-muted-foreground">想要补货？</span>
              </div>
              <div className="mt-2">
                <RestockRequestInline
                  productId={id}
                  productName={name}
                  initialCount={restockRequestCount}
                  initialRequesters={restockRequesters}
                  maxAvatars={4}
                />
              </div>
            </div>
          </div>
        )}

        {/* Category tag */}
        {category && (
          <div className="absolute bottom-3 right-3">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
              {category.name}
            </Badge>
          </div>
        )}

        {/* Hover affordance：明确这是可点的卡片（不做强 CTA，避免喧宾夺主） */}
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full border border-border/40 bg-background/70 px-2 py-1 text-xs text-muted-foreground opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <span>查看</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-focus-within:-translate-y-0.5 group-focus-within:translate-x-0.5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Title + Price：把价格提升到首屏层级（电商转化关键），同时保持信息密度不过载 */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-semibold text-base leading-snug line-clamp-2 transition-colors group-hover:text-primary group-focus-within:text-primary">
            {name}
          </h3>
          <div className="shrink-0 text-right">
            <div className="inline-flex items-baseline gap-1 rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-xs font-semibold tabular-nums backdrop-blur-sm">
              <span className="text-sm font-bold text-foreground">{price}</span>
              <span className="text-xs font-medium text-muted-foreground">LDC</span>
            </div>
            {hasDiscount && (
              <div className="mt-1 text-[11px] tabular-nums text-muted-foreground line-through">
                {originalPrice} LDC
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}

        {/* Footer */}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-xs">
          {salesCount !== undefined && salesCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-700 tabular-nums dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              已售 {salesCount}
            </span>
          )}
          {!isOutOfStock && stock > 0 && stock <= 10 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-amber-800 tabular-nums dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              仅剩 {stock}
            </span>
          )}
        </div>
      </div>
      </div>

      {/* Hover accent line */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary scale-x-0 transition-transform duration-300 group-hover:scale-x-100 group-focus-within:scale-x-100" />
    </div>
  );
}
