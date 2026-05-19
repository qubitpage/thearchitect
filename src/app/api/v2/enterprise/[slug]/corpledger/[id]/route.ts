/**
 * PATCH /api/v2/enterprise/[slug]/corpledger/[id] — Review a corporate transaction
 */

import { authenticateEnterprise } from "@/lib/core/rbac";
import * as enterprise from "@/lib/modules/enterprise";
import { z } from "zod";

type Params = { params: Promise<{ slug: string; id: string }> };

const ReviewSchema = z.object({
  status: z.enum(["accepted", "rejected", "quarantined"]),
});

export async function PATCH(request: Request, ctx: Params) {
  const { slug, id } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = ReviewSchema.parse(body);
    const tx = await enterprise.reviewCorpTransaction(id, parsed.status);
    return Response.json(tx);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
