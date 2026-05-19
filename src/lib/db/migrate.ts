/**
 * Database migration runner — applies schema to PostgreSQL.
 *
 * Run: npx tsx src/lib/db/migrate.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const url =
    process.env.DATABASE_URL ??
    `postgresql://${process.env.DB_USER ?? "architect"}:${process.env.DB_PASSWORD ?? "architect"}@${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? "5432"}/${process.env.DB_NAME ?? "the_architect"}`;

  console.log(`[migrate] Connecting to database...`);
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  console.log(`[migrate] Running migrations from drizzle/...`);
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log(`[migrate] Done.`);
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] FAILED:", err);
  process.exit(1);
});
