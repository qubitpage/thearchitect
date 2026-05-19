/**
 * GET /api/v2/enterprise/[slug] — Full enterprise snapshot (dashboard data)
 */

import { authenticateEnterprise } from "@/lib/core/rbac";
import * as enterprise from "@/lib/modules/enterprise";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, ctx: Params) {
  const { slug } = await ctx.params;

  // Try enterprise API key auth first
  const apiKey = request.headers.get("x-enterprise-key");
  if (apiKey) {
    const auth = await authenticateEnterprise(request);
    if (!auth.ok) return auth.error;
    if (auth.enterprise.slug !== slug) {
      return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
    }
  }

  // Allow public read for basic snapshot (SSR page needs this)
  try {
    const snapshot = await enterprise.getEnterpriseSnapshot(slug);
    if (!snapshot) return Response.json({ error: "Enterprise not found" }, { status: 404 });
    return Response.json(snapshot);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
