import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/actions/categories";
import { getActiveProducts } from "@/lib/actions/products";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Package, Grid3X3 } from "lucide-react";

// ISR: 每 60 秒重新验证页面缓存
export const revalidate = 60;
// 为什么这样做：分类页同样不依赖用户态（只展示商品列表），强制静态化 + ISR 可显著降低首页跳转与分类切换的 TTFB。
export const dynamic = "force-static";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return { title: "分类未找到" };
  }

  return {
    title: `${category.name} - LDC Store`,
    description: category.description || `${category.name} 分类商品`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const products = await getActiveProducts({
    categoryId: category.id,
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/" className="hover:text-violet-600">
          首页
        </Link>
        <ChevronLeft className="h-4 w-4 rotate-180" />
        <span className="text-zinc-900 dark:text-zinc-100">{category.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
            <Grid3X3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
              restockRequestCount={product.restockRequestCount}
              restockRequesters={product.restockRequesters}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-16 w-16 text-zinc-300 dark:text-zinc-700" />
          <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            该分类暂无商品
          </h3>
          <p className="mt-2 text-sm text-zinc-500">商品即将上架，敬请期待</p>
          <Link href="/" className="mt-6">
            <Button variant="outline" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
