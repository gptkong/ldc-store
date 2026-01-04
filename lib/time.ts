/**
 * 时间处理工具
 *
 * 设计原则：
 * 1. 服务端：JavaScript Date 对象内部存储 UTC 时间戳
 * 2. 数据库：使用 timestamp with time zone，PostgreSQL 自动以 UTC 存储
 * 3. 前端：浏览器自动将 UTC 时间转换为用户本地时区显示
 *
 * 注意事项：
 * - 服务端时间计算应避免使用 setHours() 等本地时区方法
 * - 数据库时间比较建议使用 SQL 函数（如 NOW()、date_trunc()）确保一致性
 * - 前端显示时间使用 toLocaleString() 或 date-fns 格式化
 */

import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

// ============================================
// 服务端时间工具（用于 Server Actions / API）
// ============================================

/**
 * 获取当前 UTC 时间戳的 Date 对象
 * JavaScript Date 内部就是 UTC，此函数主要用于语义化
 */
export function utcNow(): Date {
  return new Date();
}

/**
 * 获取 UTC 格式的某一天开始时间（00:00:00.000）
 * 用于需要在 JavaScript 中计算日期范围的场景
 *
 * @param date 目标日期，默认为当前时间
 * @returns UTC 时间的当天 00:00:00
 *
 * @example
 * // 获取今天 UTC 00:00:00
 * const todayStart = getUtcDayStart();
 *
 * // 获取指定日期的 UTC 00:00:00
 * const someDay = getUtcDayStart(new Date('2024-01-15'));
 */
export function getUtcDayStart(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
}

/**
 * 获取 UTC 格式的某一天结束时间（23:59:59.999）
 *
 * @param date 目标日期，默认为当前时间
 */
export function getUtcDayEnd(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
}

/**
 * 计算从当前时间起的过期时间
 *
 * @param minutes 分钟数
 * @returns 过期时间的 Date 对象
 *
 * @example
 * // 10 分钟后过期
 * const expireTime = getExpireTime(10);
 */
export function getExpireTime(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * 检查时间是否已过期
 *
 * @param expireTime 过期时间
 * @returns 是否已过期
 */
export function isExpired(expireTime: Date | string | null | undefined): boolean {
  if (!expireTime) return false;
  const expire = typeof expireTime === "string" ? new Date(expireTime) : expireTime;
  return Date.now() > expire.getTime();
}

/**
 * 计算剩余时间（秒）
 *
 * @param expireTime 过期时间
 * @returns 剩余秒数，已过期返回 0
 */
export function getRemainingSeconds(expireTime: Date | string): number {
  const expire = typeof expireTime === "string" ? new Date(expireTime) : expireTime;
  const remaining = Math.floor((expire.getTime() - Date.now()) / 1000);
  return Math.max(0, remaining);
}

// ============================================
// 前端时间格式化工具（用于 React 组件）
// ============================================

/**
 * 格式化时间为本地时区显示
 * 浏览器会自动将 UTC 时间转换为用户本地时区
 *
 * @param date 日期对象或 ISO 字符串
 * @param pattern 格式化模式，默认 "yyyy-MM-dd HH:mm"
 */
export function formatLocalTime(date: Date | string, pattern: string = "yyyy-MM-dd HH:mm"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: zhCN });
}

/**
 * 格式化为简短时间（用于列表显示）
 * - 今天的时间只显示 HH:mm
 * - 其他日期显示 MM-dd HH:mm
 *
 * @param date 日期对象或 ISO 字符串
 */
export function formatShortTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  return isToday ? format(d, "HH:mm", { locale: zhCN }) : format(d, "MM-dd HH:mm", { locale: zhCN });
}

/**
 * 格式化为相对时间（如 "5 分钟前"）
 *
 * @param date 日期对象或 ISO 字符串
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
}

/**
 * 格式化剩余时间为人类可读格式
 *
 * @param seconds 剩余秒数
 * @returns 格式化的字符串，如 "5:30" 或 "已过期"
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "已过期";

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

