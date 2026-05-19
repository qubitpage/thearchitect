/**
 * POST  /api/v2/enterprise/[slug]/proposals/[id]/vote — Cast a vote on a proposal
 * PATCH /api/v2/enterprise/[slug]/proposals/[id]/vote — Close the proposal (admin)
 */

import { authenticateEnterprise } from "@/lib/core/rbac";
import * as enterprise from "@/lib/modules/enterprise";
import { z } from "zod";

type Params = { params: Promise<{ slug: string; id: string }> };

const VoteSchema = z.object({
  voterId: z.string().min(1),
  voterType: z.enum(["employee", "shareholder", "delegate"]).default("employee"),
  vote: z.enum(["for", "against", "abstain"]),
  weight: z.number().min(0).max(10).default(1),
  delegatedFrom: z.string().optional(),
});

export async function POST(request: Request, ctx: Params) {
  const { slug, id } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = VoteSchema.parse(body);
    const vote = await enterprise.castVote({ proposalId: id, ...parsed });
    return Response.json(vote, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes("closed")) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: Params) {
  const { slug, id } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }

  try {
    const proposal = await enterprise.closeProposal(id);
    return Response.json(proposal);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
