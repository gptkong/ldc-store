import { cn } from "@/lib/utils";
import { useId } from "react";

interface LinuxDoLogoProps {
  className?: string;
}

export function LinuxDoLogo({ className }: LinuxDoLogoProps) {
  // 同一页面可能渲染多个 Logo（例如响应式同时渲染两份，仅用 CSS hidden 切换），
  // 如果 SVG 内部 id 固定，会导致 clipPath 引用冲突，从而出现“圆形变方形”的渲染异常。
  const clipPathId = useId();
  const safeClipPathId = `linuxdo-clip-${clipPathId.replace(/:/g, "")}`;

  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
    >
      <clipPath id={safeClipPathId}>
        <circle cx="60" cy="60" r="47" />
      </clipPath>
      <circle fill="#f0f0f0" cx="60" cy="60" r="50" />
      <rect
        fill="#1c1c1e"
        clipPath={`url(#${safeClipPathId})`}
        x="10"
        y="10"
        width="100"
        height="30"
      />
      <rect
        fill="#f0f0f0"
        clipPath={`url(#${safeClipPathId})`}
        x="10"
        y="40"
        width="100"
        height="40"
      />
      <rect
        fill="#ffb003"
        clipPath={`url(#${safeClipPathId})`}
        x="10"
        y="80"
        width="100"
        height="30"
      />
    </svg>
  );
}
