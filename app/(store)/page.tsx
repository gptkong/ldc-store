import { Suspense } from "react";
import { ProductCard } from "@/components/store/product-card";
import { getActiveProducts } from "@/lib/actions/products";
import { getActiveCategories } from "@/lib/actions/categories";
import { getActiveAnnouncements } from "@/lib/actions/announcements";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { AnnouncementBanner } from "@/components/store/announcement-banner";
import { renderMarkdownToSafeHtml } from "@/lib/markdown";
import {
  FilterableProductItem,
  HomeCategoryFilter,
} from "@/components/store/home-category-filter";

// ISR: 每 60 秒重新验证页面缓存
// 这样既保持了性能（CDN 缓存），又确保数据在 60 秒内更新
export const revalidate = 60;

async function HomeProductSection() {
  const [categories, products] = await Promise.all([
    getActiveCategories(),
    getActiveProducts({ limit: 100 }),
  ]);

  const categoryTabs = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
  }));

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Package className="mb-4 h-12 w-12 opacity-50" />
        <p className="text-lg font-medium">暂无商品</p>
        <p className="mt-1 text-sm">请稍后再来看看吧</p>
      </div>
    );
  }

  return (
    <HomeCategoryFilter categories={categoryTabs}>
      {products.map((product) => (
        <FilterableProductItem
          key={product.id}
          categoryId={product.categoryId ?? null}
        >
          <ProductCard
            id={product.id}
            name={product.name}
            slug={product.slug}
            description={product.description}
            price={product.price}
            originalPrice={product.originalPrice}
            coverImage={product.coverImage}
            stock={product.stock}
            isFeatured={product.isFeatured}
            salesCount={product.salesCount}
            category={product.category}
            restockRequestCount={product.restockRequestCount}
            restockRequesters={product.restockRequesters}
          />
        </FilterableProductItem>
      ))}
    </HomeCategoryFilter>
  );
}

function ProductGridSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
        >
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex flex-wrap gap-2 pt-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default async function HomePage() {
  const announcements = await getActiveAnnouncements();
  const bannerItems = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    // 关键：在服务端完成 Markdown → 安全 HTML，避免把 sanitize-html 打进客户端包
    contentHtml: renderMarkdownToSafeHtml(a.content),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AnnouncementBanner announcements={bannerItems} />

      {/* Categories */}
      <div className="mb-8">
        <Suspense
          fallback={
            <div className="space-y-6">
              <Skeleton className="h-9 w-64" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <ProductGridSkeleton />
              </div>
            </div>
          }
        >
          <HomeProductSection />
        </Suspense>
      </div>
    </div>
  );
}
