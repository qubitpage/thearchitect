/**
 * GET  /api/v2/impact-ledger/entries — List impact entries (filterable)
 * POST /api/v2/impact-ledger/entries — Create impact entry
 */

import { authorize } from "@/lib/core/rbac";
import * as impactLedger from "@/lib/modules/impact-ledger";
import { z } from "zod";

const CreateEntrySchema = z.object({
  actorName: z.string().min(1),
  sector: z.string().min(1),
  jurisdictionId: z.string().uuid().optional(),
  jurisdiction: z.string().min(1),
  reportingPeriod: z.string().min(1),
  emissionsTonsCo2e: z.number().nonnegative().default(0),
  waterM3: z.number().nonnegative().default(0),
  wasteKg: z.number().nonnegative().default(0),
  laborIncidents: z.number().nonnegative().default(0),
  animalWelfareScore: z.number().min(0).max(100).default(100),
  biodiversityImpact: z.number().default(0),
  supplyChainRisk: z.number().min(0).max(100).default(0),
  enterpriseId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const sector = url.searchParams.get("sector") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const enterpriseId = url.searchParams.get("enterpriseId") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  try {
    const entries = await impactLedger.listImpactEntries({ sector, status, enterpriseId, limit, offset });
    const metrics = await impactLedger.getImpactMetrics();
    return Response.json({ entries, metrics });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "write:govledger");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateEntrySchema.parse(body);
    const entry = await impactLedger.createImpactEntry(parsed);
    return Response.json(entry, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
