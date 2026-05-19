/**
 * GET  /api/v2/jurisdictions — List all jurisdictions
 * POST /api/v2/jurisdictions — Create a jurisdiction
 */

import { authorize } from "@/lib/core/rbac";
import * as jurisdictions from "@/lib/modules/jurisdictions";
import { z } from "zod";

const CreateJurisdictionSchema = z.object({
  name: z.string().min(1),
  region: z.string().min(1),
  governanceModel: z.string().min(1),
  population: z.number().positive(),
  modules: z.array(z.string()).default([]),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const items = await jurisdictions.listJurisdictions({ status });
    const metrics = await jurisdictions.getJurisdictionMetrics();
    return Response.json({ jurisdictions: items, metrics });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateJurisdictionSchema.parse(body);
    const j = await jurisdictions.createJurisdiction(parsed);
    return Response.json(j, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
