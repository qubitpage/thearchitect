/**
 * POST /api/v2/security/inspect — Run DPI inspection on arbitrary content
 * GET  /api/v2/security/inspect — Get available policy packs
 */

import { inspect, getAllPolicyPacks } from "@/lib/core/dpi-engine";
import { authorize } from "@/lib/core/rbac";
import { z } from "zod";

const InspectSchema = z.object({
  content: z.string().min(1),
  direction: z.enum(["ingress", "egress"]).default("ingress"),
  actor: z.string().default("anonymous"),
  compliancePack: z.enum(["general", "hipaa", "soc2", "finance"]).default("general"),
  enterpriseId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const packs = getAllPolicyPacks();
  return Response.json({ packs });
}

export async function POST(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = InspectSchema.parse(body);
    const result = await inspect(parsed);
    return Response.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
