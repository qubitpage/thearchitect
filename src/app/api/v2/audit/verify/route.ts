/**
 * GET /api/v2/audit/verify — Verify the integrity of the audit chain
 */

import { verifyAuditChain } from "@/lib/core/audit";
import { authorize } from "@/lib/core/rbac";

export async function GET(request: Request) {
  const auth = authorize(request, "read:audit");
  if (!auth.ok) return auth.error;

  try {
    const result = await verifyAuditChain();
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
