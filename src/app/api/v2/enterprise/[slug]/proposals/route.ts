/**
 * POST /api/v2/enterprise/[slug]/proposals — Create a voting proposal
 * GET  /api/v2/enterprise/[slug]/proposals — List voting proposals
 */

import { authenticateEnterprise } from "@/lib/core/rbac";
import * as enterprise from "@/lib/modules/enterprise";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const CreateProposalSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  category: z.string().min(1),
  proposedBy: z.string().min(1),
  totalEligible: z.number().positive(),
  closesAt: z.string().optional(),
  requiredQuorum: z.number().min(0).max(1).optional(),
});

export async function GET(request: Request, ctx: Params) {
  const { slug } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  try {
    const proposals = await enterprise.listProposals(auth.enterprise.id, limit);
    return Response.json({ proposals });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: Params) {
  const { slug } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = CreateProposalSchema.parse(body);
    const proposal = await enterprise.createProposal({
      enterpriseId: auth.enterprise.id,
      ...parsed,
    });
    return Response.json(proposal, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
