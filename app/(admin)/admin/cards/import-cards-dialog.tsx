"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { importCards } from "@/lib/actions/cards";
import { toast } from "sonner";
import { Loader2, Plus, Upload } from "lucide-react";

interface ImportCardsDialogProps {
  productId: string;
  children?: React.ReactNode;
}

export function ImportCardsDialog({
  productId,
  children,
}: ImportCardsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [delimiter, setDelimiter] = useState<"newline" | "comma">("newline");
  const [deduplicate, setDeduplicate] = useState(true);
  const [isPending, startTransition] = useTransition();

  const handleImport = () => {
    if (!content.trim()) {
      toast.error("请输入卡密内容");
      return;
    }

    startTransition(async () => {
      const result = await importCards({
        productId,
        content,
        delimiter,
        deduplicate,
      });

      if (result.success) {
        toast.success(result.message, {
          description: result.stats
            ? result.stats.deduplicate
              ? `总计: ${result.stats.total}, 跳过: ${result.stats.skipped}, 导入: ${result.stats.imported}`
              : `总计: ${result.stats.total}, 导入: ${result.stats.imported}（未去重）`
            : undefined,
        });
        setContent("");
        setOpen(false);
        // 为什么这样做：导入会影响库存与列表，需要刷新以立刻看到最新卡密与统计。
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  // Count cards preview
  const cardCount = content
    .split(delimiter === "newline" ? /\r?\n/ : ",")
    .filter((c) => c.trim().length > 0).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            导入卡密
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            批量导入卡密
          </DialogTitle>
          <DialogDescription>
            将卡密粘贴到下方文本框，可选择去重或允许重复导入。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-1">
              <Label htmlFor="import-cards-deduplicate">去重</Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {deduplicate
                  ? "开启后会过滤输入重复与数据库已存在的卡密。"
                  : "关闭后将按原样导入（允许重复），可能导致重复发货。"}
              </p>
            </div>
            <Switch
              id="import-cards-deduplicate"
              checked={deduplicate}
              onCheckedChange={setDeduplicate}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>分隔方式</Label>
            <Select
              value={delimiter}
              onValueChange={(v) => setDelimiter(v as "newline" | "comma")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newline">每行一个</SelectItem>
                <SelectItem value="comma">逗号分隔</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>卡密内容</Label>
              <span className="text-xs text-zinc-500">
                {cardCount > 0 ? `${cardCount} 个卡密` : ""}
              </span>
            </div>
            <Textarea
              placeholder={
                delimiter === "newline"
                  ? "每行一个卡密\ncard-001\ncard-002\ncard-003"
                  : "逗号分隔: card-001, card-002, card-003"
              }
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={isPending || !content.trim()}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                导入 {cardCount > 0 ? `(${cardCount})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
