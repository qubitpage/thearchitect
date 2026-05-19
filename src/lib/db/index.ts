/**
 * Database connection — singleton Drizzle ORM instance.
 *
 * Uses field-style env vars (DB_HOST, DB_PORT, etc.) per workspace rules.
 * Falls back to a built connection string if DATABASE_URL is set.
 * In development, attaches to globalThis to survive HMR.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function buildConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST ?? "localhost";
  const port = process.env.DB_PORT ?? "5432";
  const name = process.env.DB_NAME ?? "the_architect";
  const user = process.env.DB_USER ?? "architect";
  const pass = process.env.DB_PASSWORD ?? "architect";
  const ssl = process.env.DB_SSL === "true" ? "?sslmode=require" : "";

  return `postgresql://${user}:${pass}@${host}:${port}/${name}${ssl}`;
}

type GlobalDb = typeof globalThis & {
  __architectPool?: pg.Pool;
};

function getPool(): pg.Pool {
  const g = globalThis as GlobalDb;
  if (!g.__architectPool) {
    g.__architectPool = new Pool({
      connectionString: buildConnectionString(),
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return g.__architectPool;
}

export const pool = getPool();
export const db = drizzle(pool, { schema });
export { schema };
