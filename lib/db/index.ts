import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// 延迟初始化的数据库实例
let _db: PostgresJsDatabase<typeof schema> | null = null;

/**
 * 获取数据库实例（延迟初始化）
 * 仅在首次访问时创建连接，允许 next build 在无 DATABASE_URL 时完成
 */
function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) {
    return _db;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // 创建 postgres 客户端
  // 在生产环境中，推荐使用连接池
  const client = postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // 创建 drizzle 实例
  _db = drizzle(client, { schema });
  return _db;
}

/**
 * 数据库实例代理
 * 对外暴露与原 db 完全相同的 API，但延迟到实际使用时才初始化连接
 */
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(_target, prop: string | symbol) {
      const realDb = getDb();
      const value = realDb[prop as keyof typeof realDb];
      if (typeof value === "function") {
        return value.bind(realDb);
      }
      return value;
    },
  }
);

// 导出 schema 供其他模块使用
export * from "./schema";
