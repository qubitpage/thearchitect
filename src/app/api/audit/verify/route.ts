import { authorize } from "@/lib/auth";
import { verifyAuditChain } from "@/lib/audit-chain";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  const auth = authorize(request, "read:audit");
  if (!auth.ok) return auth.error;

  const verification = await verifyAuditChain(getStore().auditEvents);
  return Response.json(verification);
}
