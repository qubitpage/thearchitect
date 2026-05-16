import { authorize } from "@/lib/auth";
import { buildHashChain, verifyAuditChain } from "@/lib/audit-chain";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  const auth = authorize(request, "read:audit");
  if (!auth.ok) return auth.error;

  const store = getStore();
  const chain = await buildHashChain(store.auditEvents);
  const verification = await verifyAuditChain(store.auditEvents);

  return Response.json({
    verification,
    chain: chain.slice(-50),
  });
}
