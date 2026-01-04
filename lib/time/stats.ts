import { sql, type SQL } from "drizzle-orm";

const DEFAULT_STATS_TIMEZONE = "Asia/Shanghai";

function isSafeTimeZoneValue(timeZone: string): boolean {
  // 仅允许 IANA 时区名常见字符，避免引号/分号等导致 SQL 解析问题
  // 例：Asia/Shanghai、UTC、America/Los_Angeles
  return /^[A-Za-z0-9_+/.-]+$/.test(timeZone);
}

/**
 * 获取统计口径时区（用于“今日销售”等报表口径）
 *
 * - 默认：Asia/Shanghai（UTC+8）
 * - 可通过环境变量 STATS_TIMEZONE 覆盖
 */
export function getStatsTimeZone(): string {
  const raw = process.env.STATS_TIMEZONE?.trim();
  if (!raw) return DEFAULT_STATS_TIMEZONE;
  if (!isSafeTimeZoneValue(raw)) return DEFAULT_STATS_TIMEZONE;
  return raw;
}

/**
 * 计算“业务时区的今日”时间范围（半开区间：[start, end)）
 *
 * 说明：
 * - orders.paidAt 等字段为 timestamptz
 * - 通过 AT TIME ZONE 显式指定时区，避免依赖数据库 session TimeZone
 */
export function getTodayRangeSql(timeZone: string): { start: SQL; end: SQL } {
  const tz = isSafeTimeZoneValue(timeZone) ? timeZone : DEFAULT_STATS_TIMEZONE;

  // NOW() -> timestamptz
  // NOW() AT TIME ZONE tz -> timestamp（tz 本地时间）
  // date_trunc('day', ...) -> timestamp（tz 本地日 00:00）
  // ... AT TIME ZONE tz -> timestamptz（转换回绝对时间戳，便于与 paidAt 比较）
  const localNow = sql`NOW() AT TIME ZONE ${tz}`;
  const localDayStart = sql`date_trunc('day', ${localNow})`;

  const start = sql`${localDayStart} AT TIME ZONE ${tz}`;
  const end = sql`(${localDayStart} + interval '1 day') AT TIME ZONE ${tz}`;

  return { start, end };
}
