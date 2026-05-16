import { NextRequest } from "next/server";
import {
  addAgentTask,
  getEnterpriseBySlug,
  getEnterpriseTasks,
} from "@/lib/enterprise/store";
import { executeAgentTask } from "@/lib/enterprise/agent";
import { agentTaskSchema } from "@/lib/enterprise/validation";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const enterprise = getEnterpriseBySlug(slug);
  if (!enterprise) {
    return Response.json({ error: "Enterprise not found" }, { status: 404 });
  }

  return Response.json({ tasks: getEnterpriseTasks(enterprise.id) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const enterprise = getEnterpriseBySlug(slug);
  if (!enterprise) {
    return Response.json({ error: "Enterprise not found" }, { status: 404 });
  }

  if (enterprise.agentsUsed >= enterprise.agentQuota) {
    return Response.json(
      { error: "Agent quota exceeded", quota: enterprise.agentQuota, used: enterprise.agentsUsed },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = agentTaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await executeAgentTask(
    enterprise.id,
    parsed.data.type,
    parsed.data.input,
    parsed.data.context,
  );

  addAgentTask(task);
  enterprise.agentsUsed += 1;

  return Response.json(task, { status: 201 });
}
