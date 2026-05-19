/**
 * GET /api/v2/audit/chain — Get audit events (paginated)
 */

import { getAuditChain, getAuditCount } from "@/lib/core/audit";
import { authorize } from "@/lib/core/rbac";

export async function GET(request: Request) {
  const auth = authorize(request, "read:audit");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  try {
    const events = await getAuditChain(limit, offset);
    const total = await getAuditCount();
    return Response.json({ events, total, limit, offset });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
