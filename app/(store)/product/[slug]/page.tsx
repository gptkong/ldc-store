import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { getProductBySlug } from "@/lib/actions/products";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft } from "lucide-react";
import { OrderForm } from "./order-form";
import { renderMarkdownToSafeHtml } from "@/lib/markdown";
import { ProductImageGallery } from "./product-image-gallery";
import { RestockRequestInline } from "@/components/store/restock-request-inline";

// ISR: 每 60 秒重新验证页面缓存
export const revalidate = 60;
// 为什么这样做：商品详情页不包含用户态的服务端渲染内容（登录态在客户端判断），因此可以强制静态化 + ISR，让首跳与回跳都走缓存。
export const dynamic = "force-static";

// 为什么这样做：generateMetadata 与页面本体都会读同一份商品数据；用 request 级 memoization 避免重复查库（首跳/预取时延会明显下降）。
const getProductBySlugCached = cache(getProductBySlug);

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlugCached(slug);

  if (!product) {
    return { title: "商品未找到" };
  }

  return {
    title: `${product.name} - LDC Store`,
    description: product.description || product.name,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlugCached(slug);

  if (!product) {
    notFound();
  }

  const isOutOfStock = product.stock === 0;
  const hasDiscount =
    product.originalPrice &&
    parseFloat(product.originalPrice) > parseFloat(product.price);
  const contentHtml = product.content
    ? renderMarkdownToSafeHtml(product.content)
    : "";
  const imageUrls = [
    product.coverImage,
    ...(product.images ?? []),
  ].filter((url): url is string => typeof url === "string" && url.trim().length > 0);
  const uniqueImageUrls = Array.from(new Set(imageUrls));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Back */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        返回首页
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{product.name}</h1>
            {product.description && (
              <p className="mt-1 text-muted-foreground">{product.description}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {product.isFeatured && (
              <Badge variant="secondary">热门</Badge>
            )}
            {product.category && (
              <Badge variant="outline">{product.category.name}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Price & Stock */}
      <div className="mb-6 flex items-baseline justify-between rounded-lg border bg-muted/30 p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{product.price} LDC</span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {product.originalPrice} LDC
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {isOutOfStock ? (
            <span className="text-destructive">暂无库存</span>
          ) : (
            <span>库存 {product.stock} · 已售 {product.salesCount}</span>
          )}
        </div>
      </div>

      {/* Order Form */}
      {isOutOfStock ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
          <div className="text-center">
            <p className="font-medium text-destructive">商品暂时缺货</p>
            <p className="mt-1 text-sm text-muted-foreground">
              你可以先催补货，我们会根据需求优先补充库存。
            </p>
          </div>

          <div className="mt-4 rounded-xl border bg-background/70 p-4">
            <RestockRequestInline
              productId={product.id}
              productName={product.name}
              initialCount={product.restockRequestCount}
              initialRequesters={product.restockRequesters}
              maxAvatars={6}
              size="md"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-6">
          <OrderForm
            productId={product.id}
            productName={product.name}
            price={parseFloat(product.price)}
            stock={product.stock}
            minQuantity={product.minQuantity}
            maxQuantity={product.maxQuantity}
          />
        </div>
      )}

      {/* Product Content */}
      {(contentHtml || uniqueImageUrls.length > 0) && (
        <>
          <Separator className="my-6" />
          <div>
            <h2 className="mb-3 font-medium">商品详情</h2>
            {uniqueImageUrls.length > 0 && (
              <ProductImageGallery
                productName={product.name}
                images={uniqueImageUrls}
              />
            )}
            {contentHtml && (
              <div
                className="prose prose-sm prose-zinc max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
