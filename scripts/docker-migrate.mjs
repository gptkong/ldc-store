/**
 * Docker runtime migration script (ESM)
 *
 * This script runs database migrations at container startup.
 * It ports the baseline logic from lib/db/baseline.ts to pure JavaScript
 * to avoid needing tsx/drizzle-kit (devDependencies) in production.
 *
 * Features:
 * - Ensures drizzle.__drizzle_migrations table exists
 * - Baselines existing databases (marks migrations as applied)
 * - Runs programmatic migrations via drizzle-orm/postgres-js/migrator
 * - Closes DB connection cleanly
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Constants
const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";
// In Docker, we're in /app, migrations are at /app/lib/db/migrations
const MIGRATIONS_DIR = path.resolve(__dirname, "../lib/db/migrations");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "meta/_journal.json");

/**
 * Read migration journal file
 * @returns {Object} Journal object with entries array
 */
function readJournal() {
  if (!fs.existsSync(JOURNAL_PATH)) {
    throw new Error(`Migration journal not found: ${JOURNAL_PATH}`);
  }
  const raw = fs.readFileSync(JOURNAL_PATH, "utf8");
  return JSON.parse(raw);
}

/**
 * Compute migration records with SHA256 hashes
 * @param {Object} journal - Journal object
 * @returns {Array} Array of migration records
 */
function computeMigrationRecords(journal) {
  return journal.entries.map((entry) => {
    const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }
    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");
    return {
      tag: entry.tag,
      createdAt: entry.when,
      hash,
    };
  });
}

/**
 * Ensure migrations schema and table exist
 * @param {Object} sql - Postgres client
 */
async function ensureMigrationsTable(sql) {
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${MIGRATIONS_SCHEMA}"`);
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

/**
 * Get count of applied migrations
 * @param {Object} sql - Postgres client
 * @returns {number} Count of applied migrations
 */
async function getAppliedMigrationsCount(sql) {
  const rows = await sql.unsafe(
    `SELECT COUNT(*)::text AS count FROM "${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}"`
  );
  const countAsString = rows[0]?.count ?? "0";
  const count = parseInt(countAsString, 10);
  return Number.isFinite(count) ? count : 0;
}

/**
 * Get count of tables in public schema
 * @param {Object} sql - Postgres client
 * @returns {number} Count of public tables
 */
async function getPublicTablesCount(sql) {
  const rows = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
  `;
  return rows.length;
}

/**
 * Run baseline logic - mark existing migrations as applied for legacy databases
 * @param {Object} sql - Postgres client
 */
async function runBaseline(sql) {
  const journal = readJournal();
  const records = computeMigrationRecords(journal);

  if (records.length === 0) {
    console.log("ℹ️  No migrations found, skipping baseline");
    return;
  }

  await ensureMigrationsTable(sql);

  const appliedCount = await getAppliedMigrationsCount(sql);
  if (appliedCount > 0) {
    console.log(`ℹ️  Found ${appliedCount} migration record(s), skipping baseline`);
    return;
  }

  const publicTablesCount = await getPublicTablesCount(sql);
  if (publicTablesCount === 0) {
    console.log("ℹ️  Empty database detected, skipping baseline");
    return;
  }

  console.log("🧱 Running baseline for legacy database...");

  for (const record of records) {
    await sql`
      INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
      SELECT ${record.hash}, ${record.createdAt}
      WHERE NOT EXISTS (
        SELECT 1
        FROM "drizzle"."__drizzle_migrations"
        WHERE "hash" = ${record.hash} AND "created_at" = ${record.createdAt}
      )
    `;
    console.log(`✅ Marked migration: ${record.tag}`);
  }

  console.log("🎉 Baseline completed");
}

/**
 * Main migration function
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  // Do not log connection string (contains secrets)
  console.log("📦 Connecting to database...");

  const sql = postgres(connectionString, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
  });

  try {
    // Step 1: Run baseline (for legacy databases that used db:push)
    await runBaseline(sql);

    // Step 2: Run programmatic migrations
    console.log("🔄 Running migrations...");
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.log("✅ Migrations completed");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await sql.end();
    console.log("🔌 Database connection closed");
  }
}

main();
