/**
 * GET /api/v2/platform/health — Platform health check
 */

import { pool } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    checks.database = "healthy";
  } catch {
    checks.database = "unavailable";
  }

  checks.api = "healthy";
  checks.version = "4.1.0";
  checks.timestamp = new Date().toISOString();

  const healthy = checks.database === "healthy";
  return Response.json(checks, { status: healthy ? 200 : 503 });
}
