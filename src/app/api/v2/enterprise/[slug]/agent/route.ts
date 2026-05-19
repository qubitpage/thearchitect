/**
 * POST /api/v2/enterprise/[slug]/agent — Create and execute an agent task
 * GET  /api/v2/enterprise/[slug]/agent — List agent tasks for enterprise
 */

import { authenticateEnterprise } from "@/lib/core/rbac";
import * as enterprise from "@/lib/modules/enterprise";
import { executeAgentTask } from "@/lib/modules/gemini-agent";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const CreateTaskSchema = z.object({
  type: z.enum([
    "analyze_spending",
    "compliance_check",
    "risk_assessment",
    "document_review",
    "anomaly_detection",
    "policy_recommendation",
  ]),
  input: z.string().min(10),
  context: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request, ctx: Params) {
  const { slug } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }
  const ent = auth.enterprise;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  try {
    const tasks = await enterprise.listAgentTasks(ent.id, limit);
    return Response.json({ tasks });
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
  const ent = auth.enterprise;

  try {
    const body = await request.json();
    const parsed = CreateTaskSchema.parse(body);

    const task = await enterprise.createAgentTask({
      enterpriseId: ent.id,
      type: parsed.type,
      input: parsed.input,
      context: parsed.context,
    });

    const result = await executeAgentTask({
      taskId: task.id,
      enterpriseId: ent.id,
      compliancePack: ent.compliancePack ?? "general",
      type: parsed.type,
      input: parsed.input,
      context: parsed.context,
    });

    return Response.json({ task: { ...task, result }, result }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes("quota")) {
      return Response.json({ error: err.message }, { status: 429 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
