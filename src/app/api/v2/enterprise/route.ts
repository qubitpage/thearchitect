/**
 * POST /api/v2/enterprise — Register a new enterprise
 * GET  /api/v2/enterprise — List all enterprises
 */

import { authorize } from "@/lib/core/rbac";
import * as enterprise from "@/lib/modules/enterprise";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  contactEmail: z.string().email(),
  industry: z.string().min(1),
  tier: z.enum(["pilot", "starter", "professional", "enterprise"]).default("starter"),
  compliancePack: z.enum(["general", "hipaa", "soc2", "finance", "custom"]).default("general"),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  try {
    const enterprises = await enterprise.listEnterprises();
    return Response.json({ enterprises });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = RegisterSchema.parse(body);
    const result = await enterprise.registerEnterprise(parsed);
    return Response.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
