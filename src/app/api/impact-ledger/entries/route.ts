import { addImpactLedgerEntry } from "@/lib/store";
import { impactLedgerEntrySchema } from "@/lib/validation";

export async function GET() {
  const { getSystemSnapshot } = await import("@/lib/snapshot");
  return Response.json({ impactEntries: getSystemSnapshot().impactEntries });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = impactLedgerEntrySchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: "Invalid Impact Ledger entry", details: parsed.error.flatten() }, { status: 400 });
  }

  const impactEntry = addImpactLedgerEntry(parsed.data);
  return Response.json({ impactEntry }, { status: 201 });
}