"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { CardStatus } from "@/lib/db";

import { buildAdminCardsHref } from "./cards-url";

function Select({
  name,
  defaultValue,
  children,
  className,
  ariaLabel,
}: {
  name: string;
  defaultValue?: string;
  children: ReactNode;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      className={
        className ??
        "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {children}
    </select>
  );
}

const cardStatusLabel: Record<CardStatus, string> = {
  available: "可用",
  locked: "锁定",
  sold: "已售",
};

export function CardsFilters({
  productId,
  q,
  status,
  orderNo,
  pageSize,
}: {
  productId: string;
  q: string;
  status?: CardStatus;
  orderNo: string;
  pageSize: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = Boolean(q || status || orderNo);

  const submit = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    const nextQ = String(formData.get("q") || "").trim();
    const nextStatus = String(formData.get("status") || "").trim();
    const nextOrderNo = String(formData.get("orderNo") || "").trim();
    const nextPageSize = Number.parseInt(String(formData.get("pageSize") || ""), 10);

    const normalizedStatus =
      nextStatus && (nextStatus as CardStatus) in cardStatusLabel
        ? (nextStatus as CardStatus)
        : undefined;

    const nextHref = buildAdminCardsHref({
      productId,
      q: nextQ || undefined,
      status: normalizedStatus,
      orderNo: nextOrderNo || undefined,
      pageSize: Number.isFinite(nextPageSize) ? nextPageSize : pageSize,
    });

    startTransition(() => {
      router.push(nextHref);
    });
  };

  const resetHref = buildAdminCardsHref({ productId, pageSize });

  return (
    <form
      className="flex flex-wrap items-center gap-2 mb-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <div className="relative flex-1 min-w-[180px] max-w-[240px]">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="搜索卡密…"
          className="pl-8 h-8 text-sm"
          aria-label="搜索卡密"
        />
      </div>

      <Input
        name="orderNo"
        defaultValue={orderNo}
        placeholder="订单号"
        className="h-8 text-sm w-[140px]"
        aria-label="按订单号查卡密"
      />

      <Select name="status" defaultValue={status ?? ""} ariaLabel="按状态筛选">
        <option value="">全部状态</option>
        {(Object.keys(cardStatusLabel) as CardStatus[]).map((value) => (
          <option key={value} value={value}>
            {cardStatusLabel[value]}
          </option>
        ))}
      </Select>

      <Select name="pageSize" defaultValue={String(pageSize)} ariaLabel="每页条数">
        {[20, 50, 100, 200].map((size) => (
          <option key={size} value={String(size)}>
            {size}/页
          </option>
        ))}
      </Select>

      <Button type="submit" size="sm" disabled={isPending}>
        筛选
      </Button>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(resetHref)}
          disabled={isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
