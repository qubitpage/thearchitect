/**
 * GET /api/v2/enterprise/[slug]/policy — Get DPI policy pack for this enterprise
 */

import { authenticateEnterprise } from "@/lib/core/rbac";
import { getPolicyPack } from "@/lib/core/dpi-engine";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, ctx: Params) {
  const { slug } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }
  const ent = auth.enterprise;

  const pack = getPolicyPack((ent.compliancePack ?? "general") as "general" | "hipaa" | "soc2" | "finance");
  return Response.json({ enterprise: slug, compliancePack: ent.compliancePack, rules: pack });
}
