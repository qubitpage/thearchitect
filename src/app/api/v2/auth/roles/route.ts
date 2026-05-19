/**
 * GET /api/v2/auth/roles — List all available roles and permissions
 */

import { getAllRoles } from "@/lib/core/rbac";

export async function GET() {
  return Response.json({ roles: getAllRoles() });
}
