/**
 * POST /api/v2/enterprise/[slug]/merit — Submit a merit evaluation
 * GET  /api/v2/enterprise/[slug]/merit — List merit evaluations
 */

import { authenticateEnterprise } from "@/lib/core/rbac";
import * as enterprise from "@/lib/modules/enterprise";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const SubmitMeritSchema = z.object({
  candidateId: z.string().min(1),
  positionTitle: z.string().min(1),
  department: z.string().min(1),
  peerScore: z.number().min(0).max(100),
  metricsScore: z.number().min(0).max(100),
  feedbackScore: z.number().min(0).max(100),
  evaluationPeriod: z.string().min(1),
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
    const evaluations = await enterprise.listMeritEvaluations(auth.enterprise.id, limit);
    return Response.json({ evaluations });
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
    const parsed = SubmitMeritSchema.parse(body);
    const evaluation = await enterprise.submitMeritEvaluation({
      enterpriseId: auth.enterprise.id,
      ...parsed,
    });
    return Response.json(evaluation, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
