import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft } from "lucide-react";

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Back */}
      <div className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        返回首页
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-5 w-72" />
          </div>
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Price & Stock */}
      <div className="mb-6 flex items-baseline justify-between rounded-lg border bg-muted/30 p-4">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Order Form */}
      <div className="rounded-lg border p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Product Content */}
      <Separator className="my-6" />
      <div>
        <Skeleton className="mb-3 h-5 w-20" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}
