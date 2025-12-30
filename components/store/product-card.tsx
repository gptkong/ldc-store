import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Flame, Package, Sparkles, TrendingUp } from "lucide-react";

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
}

export function ProductCard({
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
}: ProductCardProps) {
  const isOutOfStock = stock === 0;
  const hasDiscount = originalPrice && parseFloat(originalPrice) > parseFloat(price);
  const discountPercent = hasDiscount
    ? Math.round((1 - parseFloat(price) / parseFloat(originalPrice)) * 100)
    : 0;

  return (
    <Link
      href={`/product/${slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20"
    >
      {/* Cover Image or Gradient Background */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted/50 via-muted to-muted/80">
        {coverImage ? (
          <img
            src={coverImage}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent blur-xl" />
              <Package className="h-12 w-12 text-muted-foreground/40" />
            </div>
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {isFeatured && (
            <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-md shadow-orange-500/20 gap-1">
              <Flame className="h-3 w-3" />
              热门
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 shadow-md shadow-rose-500/20">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Stock badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Badge variant="secondary" className="text-sm font-medium px-4 py-1.5">
              已售罄
            </Badge>
          </div>
        )}

        {/* Category tag */}
        {category && (
          <div className="absolute bottom-3 right-3">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs">
              {category.name}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {name}
        </h3>

        {/* Description */}
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 flex items-end justify-between gap-2">
          {/* Price */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight">{price}</span>
              <span className="text-sm font-medium text-muted-foreground">LDC</span>
            </div>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {originalPrice} LDC
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {salesCount !== undefined && salesCount > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{salesCount}售</span>
              </div>
            )}
            {!isOutOfStock && stock > 0 && stock <= 10 && (
              <div className="flex items-center gap-1 text-orange-500">
                <Sparkles className="h-3 w-3" />
                <span>仅剩{stock}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}
