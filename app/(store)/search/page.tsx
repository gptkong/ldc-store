import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Package, ArrowLeft, ArrowRight } from "lucide-react";

import { SearchBar } from "@/components/store/search-bar";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getActiveCategories } from "@/lib/actions/categories";
import { searchProducts } from "@/lib/actions/products";

export const revalidate = 60;

const PAGE_SIZE = 12;

type SortValue = "relevance" | "price_asc" | "price_desc" | "sales_desc" | "newest";

const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: "relevance", label: "相关度" },
  { value: "sales_desc", label: "销量" },
  { value: "newest", label: "最新" },
  { value: "price_asc", label: "价格↑" },
  { value: "price_desc", label: "价格↓" },
];

function normalizeSort(value?: string): SortValue {
  if (!value) return "relevance";
  if (SORT_OPTIONS.some((o) => o.value === value)) return value as SortValue;
  return "relevance";
}

function buildSearchHref(input: {
  q?: string;
  category?: string;
  sort?: SortValue;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.category) params.set("category", input.category);
  if (input.sort && input.sort !== "relevance") params.set("sort", input.sort);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const q = (params.q || "").trim();
  const currentSort = normalizeSort(params.sort);
  const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);

  const categories = await getActiveCategories();
  const selectedCategory = params.category
    ? categories.find((c) => c.slug === params.category)
    : undefined;

  const shouldQuery = q.length >= 2;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const result = shouldQuery
    ? await searchProducts(q, {
        categoryId: selectedCategory?.id,
        sort: currentSort,
        limit: PAGE_SIZE,
        offset,
      })
    : { items: [], total: 0 };

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  if (shouldQuery && result.total > 0 && currentPage > totalPages) {
    redirect(
      buildSearchHref({
        q,
        category: selectedCategory?.slug,
        sort: currentSort,
        page: totalPages,
      })
    );
  }
  const safePage = currentPage;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          搜索商品
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          输入关键词搜索商品名称、描述或详情内容
        </p>
      </div>

      {/* SearchBar 内部使用 useSearchParams，静态预渲染时需要 Suspense 来兜底 CSR bailout。 */}
      <Suspense fallback={<div className="h-9 w-full max-w-xl rounded-md bg-muted/60 animate-pulse" />}>
        <SearchBar className="max-w-xl" />
      </Suspense>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Link href={buildSearchHref({ q, sort: currentSort })}>
          <Button
            variant={!selectedCategory ? "default" : "outline"}
            size="sm"
            className="shrink-0 rounded-full"
          >
            全部分类
          </Button>
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={buildSearchHref({ q, category: category.slug, sort: currentSort })}
          >
            <Button
              variant={selectedCategory?.id === category.id ? "default" : "outline"}
              size="sm"
              className="shrink-0 rounded-full"
            >
              {category.name}
            </Button>
          </Link>
        ))}
      </div>

      {/* Sort + Meta */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {q ? (
            <>
              <span>关键词</span>
              <Badge variant="secondary">{q}</Badge>
              {selectedCategory ? (
                <>
                  <span>· 分类</span>
                  <Badge variant="outline">{selectedCategory.name}</Badge>
                </>
              ) : null}
            </>
          ) : (
            <span>请输入关键词开始搜索</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={buildSearchHref({
                q,
                category: selectedCategory?.slug,
                sort: opt.value,
              })}
            >
              <Button
                size="sm"
                variant={currentSort === opt.value ? "default" : "outline"}
                className="rounded-full"
              >
                {opt.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Results */}
      {q.length === 0 ? (
        <div className="rounded-xl border bg-muted/20 p-10 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            在上方输入关键词，例如商品名称、标签或用途。
          </p>
        </div>
      ) : q.length < 2 ? (
        <div className="rounded-xl border bg-muted/20 p-10 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            请输入至少 2 个字符以获得更准确的结果。
          </p>
        </div>
      ) : result.total === 0 ? (
        <div className="rounded-xl border bg-muted/20 p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">未找到相关商品</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              共 {result.total} 条结果 · 第 {safePage}/{totalPages} 页
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {result.items.map((product) => (
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

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            {safePage <= 1 ? (
              <Button variant="outline" disabled className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                上一页
              </Button>
            ) : (
              <Button asChild variant="outline" className="gap-2">
                <Link
                  href={buildSearchHref({
                    q,
                    category: selectedCategory?.slug,
                    sort: currentSort,
                    page: safePage - 1,
                  })}
                >
                  <ArrowLeft className="h-4 w-4" />
                  上一页
                </Link>
              </Button>
            )}

            {safePage >= totalPages ? (
              <Button variant="outline" disabled className="gap-2">
                下一页
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button asChild variant="outline" className="gap-2">
                <Link
                  href={buildSearchHref({
                    q,
                    category: selectedCategory?.slug,
                    sort: currentSort,
                    page: safePage + 1,
                  })}
                >
                  下一页
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
