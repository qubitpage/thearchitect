import { authorize } from "@/lib/auth";
import { addGovLedgerTransaction } from "@/lib/store";
import { govLedgerTransactionSchema } from "@/lib/validation";

export async function GET() {
  const { getSystemSnapshot } = await import("@/lib/snapshot");
  return Response.json({ transactions: getSystemSnapshot().transactions });
}

export async function POST(request: Request) {
  const auth = authorize(request, "write:govledger");
  if (!auth.ok) return auth.error;

  const payload = await request.json().catch(() => null);
  const parsed = govLedgerTransactionSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: "Invalid GovLedger transaction", details: parsed.error.flatten() }, { status: 400 });
  }

  const transaction = addGovLedgerTransaction(parsed.data);
  return Response.json({ transaction }, { status: 201 });
}