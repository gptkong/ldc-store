"use client";

import { format, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useEffect, useState } from "react";

type LocalTimeMode = "short" | "full";

export interface LocalTimeProps {
  value: string | Date | null | undefined;
  mode?: LocalTimeMode;
}

function parseDate(value: LocalTimeProps["value"]): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return isValid(date) ? date : null;
}

export function LocalTime({ value, mode = "full" }: LocalTimeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 该组件的目的就是“按浏览器本地时区显示时间”，因此避免在服务端预渲染具体时间字符串，
  // 否则会出现服务端(UTC)与客户端(用户时区)不一致导致的闪烁/水合不一致问题。
  if (!mounted) return <span>-</span>;

  const date = parseDate(value);
  if (!date) return <span>-</span>;

  if (mode === "short") {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return (
      <span>
        {isToday
          ? format(date, "HH:mm", { locale: zhCN })
          : format(date, "MM-dd HH:mm", { locale: zhCN })}
      </span>
    );
  }

  return <span>{format(date, "yyyy-MM-dd HH:mm", { locale: zhCN })}</span>;
}
