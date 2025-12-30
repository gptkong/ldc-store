import { Suspense } from "react";
import { ProductCard } from "@/components/store/product-card";
import { getActiveProducts } from "@/lib/actions/products";
import { getActiveCategories } from "@/lib/actions/categories";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

async function ProductList() {
  const products = await getActiveProducts({
    limit: 20,
  });

  if (products.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">暂无商品</p>
        <p className="text-sm mt-1">请稍后再来看看吧</p>
      </div>
    );
  }

  return (
    <>
      {products.map((product) => (
        <ProductCard
          key={product.id}
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
        />
      ))}
    </>
  );
}

async function CategoryTabs({ currentCategory }: { currentCategory?: string }) {
  const categories = await getActiveCategories();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <Link href="/">
        <Button
          variant={!currentCategory ? "default" : "outline"}
          size="sm"
          className={`shrink-0 rounded-full transition-all ${
            !currentCategory 
              ? "shadow-md shadow-primary/20" 
              : "hover:bg-muted"
          }`}
        >
          全部商品
        </Button>
      </Link>
      {categories.map((category) => (
        <Link key={category.id} href={`/category/${category.slug}`}>
          <Button 
            variant="outline" 
            size="sm" 
            className="shrink-0 rounded-full hover:bg-muted transition-all"
          >
            {category.name}
          </Button>
        </Link>
      ))}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-xl border bg-card"
        >
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default async function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Categories */}
      <div className="mb-8">
        <Suspense fallback={<Skeleton className="h-9 w-64" />}>
          <CategoryTabs />
        </Suspense>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductList />
        </Suspense>
      </div>
    </div>
  );
}
