export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import {
  getEnterpriseBySlug,
  getEnterpriseInspections,
  getEnterpriseMetrics,
  getEnterpriseTasks,
} from "@/lib/enterprise/store";
import { getPolicyPack } from "@/lib/enterprise/policy-engine";
import EnterpriseDashboard from "@/components/EnterpriseDashboard";
import type { EnterpriseSnapshot } from "@/lib/enterprise/types";

type Props = { params: Promise<{ slug: string }> };

export default async function EnterpriseSlugPage({ params }: Props) {
  const { slug } = await params;
  const enterprise = getEnterpriseBySlug(slug);
  if (!enterprise) notFound();

  const metrics = getEnterpriseMetrics(enterprise.id);
  const recentInspections = getEnterpriseInspections(enterprise.id, 10);
  const recentTasks = getEnterpriseTasks(enterprise.id, 10);
  const policyPack = getPolicyPack(
    enterprise.compliancePack === "custom" ? "general" : enterprise.compliancePack,
  );

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

  return <EnterpriseDashboard snapshot={snapshot} slug={slug} />;
}
