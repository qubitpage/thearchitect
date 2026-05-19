/**
 * POST /api/v2/enterprise/[slug]/inspect — Run DPI inspection for enterprise
 */

import { authenticateEnterprise } from "@/lib/core/rbac";
import { inspect } from "@/lib/core/dpi-engine";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const InspectSchema = z.object({
  content: z.string().min(1),
  direction: z.enum(["ingress", "egress"]).default("ingress"),
  actor: z.string().default("enterprise-user"),
});

export async function POST(request: Request, ctx: Params) {
  const { slug } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }
  const ent = auth.enterprise;

  try {
    const body = await request.json();
    const parsed = InspectSchema.parse(body);
    const result = await inspect({
      ...parsed,
      enterpriseId: ent.id,
      compliancePack: (ent.compliancePack ?? "general") as "general" | "hipaa" | "soc2" | "finance",
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
