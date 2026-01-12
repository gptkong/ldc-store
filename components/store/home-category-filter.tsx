"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";

export interface CategoryTabItem {
  id: string;
  name: string;
  slug: string;
}

interface HomeCategoryFilterContextValue {
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
}

const HomeCategoryFilterContext = createContext<HomeCategoryFilterContextValue | null>(
  null
);

function useHomeCategoryFilter(): HomeCategoryFilterContextValue {
  const ctx = useContext(HomeCategoryFilterContext);
  if (!ctx) {
    throw new Error("useHomeCategoryFilter must be used within HomeCategoryFilter");
  }
  return ctx;
}

interface HomeCategoryFilterProps {
  categories: CategoryTabItem[];
  children: ReactNode;
}

export function HomeCategoryFilter({ categories, children }: HomeCategoryFilterProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const ctx = useMemo<HomeCategoryFilterContextValue>(
    () => ({ selectedCategoryId, setSelectedCategoryId }),
    [selectedCategoryId]
  );

  return (
    <HomeCategoryFilterContext.Provider value={ctx}>
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            type="button"
            variant={!selectedCategoryId ? "default" : "outline"}
            size="sm"
            className={`shrink-0 rounded-full transition-all ${
              !selectedCategoryId ? "shadow-md shadow-primary/20" : "hover:bg-muted"
            }`}
            onClick={() => setSelectedCategoryId(null)}
          >
            全部商品
          </Button>

          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              variant={selectedCategoryId === category.id ? "default" : "outline"}
              size="sm"
              className={`shrink-0 rounded-full transition-all ${
                selectedCategoryId === category.id
                  ? "shadow-md shadow-primary/20"
                  : "hover:bg-muted"
              }`}
              onClick={() => setSelectedCategoryId(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      </div>
    </HomeCategoryFilterContext.Provider>
  );
}

interface FilterableProductItemProps {
  categoryId: string | null;
  children: ReactNode;
}

export function FilterableProductItem({
  categoryId,
  children,
}: FilterableProductItemProps) {
  const { selectedCategoryId } = useHomeCategoryFilter();

  // 为什么这样做：用户要求首页分类筛选不通过路由跳转，改为纯前端筛选；
  // 这里通过 Context 共享选中分类，用条件渲染完成筛选，不触发网络请求/路由变化。
  if (selectedCategoryId && categoryId !== selectedCategoryId) {
    return null;
  }

  return children;
}

