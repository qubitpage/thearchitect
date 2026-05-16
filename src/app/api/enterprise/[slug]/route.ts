import { NextRequest } from "next/server";
import {
  getEnterpriseBySlug,
  getEnterpriseInspections,
  getEnterpriseMetrics,
  getEnterpriseTasks,
} from "@/lib/enterprise/store";
import { getPolicyPack } from "@/lib/enterprise/policy-engine";
import type { EnterpriseSnapshot } from "@/lib/enterprise/types";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const enterprise = getEnterpriseBySlug(slug);
  if (!enterprise) {
    return Response.json({ error: "Enterprise not found" }, { status: 404 });
  }

  const metrics = getEnterpriseMetrics(enterprise.id);
  const recentInspections = getEnterpriseInspections(enterprise.id, 10);
  const recentTasks = getEnterpriseTasks(enterprise.id, 10);
  const policyPack = getPolicyPack(enterprise.compliancePack === "custom" ? "general" : enterprise.compliancePack);

  const snapshot: EnterpriseSnapshot = {
    enterprise: { ...enterprise, apiKeyHash: "[REDACTED]" },
    metrics: {
      totalInspections: metrics.totalInspections,
      blockedThreats: metrics.blockedThreats,
      allowedRequests: metrics.allowedRequests,
      humanReviewPending: metrics.humanReviewPending,
      complianceScore: metrics.complianceScore,
      agentTasksCompleted: metrics.agentTasksCompleted,
      averageRiskScore: metrics.averageRiskScore,
      piiExposuresBlocked: metrics.piiExposuresBlocked,
      exfiltrationAttempts: metrics.exfiltrationAttempts,
    },
    recentInspections,
    recentTasks,
    policyPack,
    topThreats: metrics.topThreats,
  };

  return Response.json(snapshot);
}
