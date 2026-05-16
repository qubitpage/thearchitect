/**
 * Enterprise Governance Types — Multi-Tenant Enterprise Module
 *
 * WHAT THIS IS:
 * The enterprise module lets organizations subscribe to The Architect as a
 * governance-as-a-service platform. Each enterprise gets its own isolated
 * tenant with:
 * - API key for authentication
 * - Compliance policy pack (HIPAA, SOC2, Finance, General)
 * - Agent activity monitoring and audit trail
 * - Lobster Trap DPI integration
 * - Gemini AI governance agent access
 *
 * HOW ENTERPRISES USE IT:
 * 1. Register via POST /api/enterprise/register
 * 2. Receive an API key (x-enterprise-key header)
 * 3. All subsequent requests are scoped to their tenant
 * 4. Choose a compliance track (policy pack)
 * 5. Use the AI governance agent for analysis
 * 6. View their enterprise dashboard at /enterprise/[slug]
 */

import type { PolicyAction } from "@/lib/types";

export type CompliancePack = "general" | "hipaa" | "soc2" | "finance" | "custom";

export type EnterpriseTier = "pilot" | "starter" | "professional" | "enterprise";

export type EnterpriseStatus = "active" | "trial" | "suspended" | "deactivated";

export type Enterprise = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  tier: EnterpriseTier;
  status: EnterpriseStatus;
  compliancePack: CompliancePack;
  apiKeyHash: string;
  contactEmail: string;
  industry: string;
  agentQuota: number;
  agentsUsed: number;
  createdAt: string;
};

/** Lobster Trap-compatible policy rule (YAML-serializable) */
export type LobsterTrapRule = {
  id: string;
  name: string;
  description: string;
  direction: "ingress" | "egress" | "both";
  pattern: string;
  patternType: "regex" | "keyword" | "semantic";
  score: number;
  action: PolicyAction;
  tags: string[];
  compliancePack: CompliancePack;
};

export type PolicyPack = {
  id: string;
  name: string;
  description: string;
  version: string;
  compliance: CompliancePack;
  rules: LobsterTrapRule[];
};

/** Agent task submitted to the Gemini governance agent */
export type AgentTask = {
  id: string;
  enterpriseId: string;
  type: "analyze_spending" | "compliance_check" | "risk_assessment" | "document_review" | "anomaly_detection" | "policy_recommendation";
  input: string;
  context?: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: AgentResult;
  createdAt: string;
  completedAt?: string;
};

export type AgentResult = {
  summary: string;
  findings: AgentFinding[];
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
  confidence: number;
  model: string;
  tokensUsed: number;
};

export type AgentFinding = {
  category: string;
  severity: "info" | "warning" | "critical";
  description: string;
  evidence?: string;
  remediation?: string;
};

/** Enterprise-scoped DPI inspection with Lobster Trap metadata */
export type EnterpriseDpiInspection = {
  id: string;
  enterpriseId: string;
  actor: string;
  direction: "ingress" | "egress";
  action: PolicyAction;
  riskScore: number;
  matchedRules: string[];
  policyPack: CompliancePack;
  redactedPreview: string;
  /** Lobster Trap _lobstertrap metadata block */
  lobsterTrapMeta: {
    declaredIntent?: string;
    detectedIntent: string;
    intentMatch: boolean;
    extractedEntities: string[];
    piiDetected: boolean;
    credentialsDetected: boolean;
    exfiltrationRisk: boolean;
  };
  createdAt: string;
};

/** Enterprise dashboard snapshot */
export type EnterpriseSnapshot = {
  enterprise: Enterprise;
  metrics: {
    totalInspections: number;
    blockedThreats: number;
    allowedRequests: number;
    humanReviewPending: number;
    complianceScore: number;
    agentTasksCompleted: number;
    averageRiskScore: number;
    piiExposuresBlocked: number;
    exfiltrationAttempts: number;
  };
  recentInspections: EnterpriseDpiInspection[];
  recentTasks: AgentTask[];
  policyPack: PolicyPack;
  topThreats: { rule: string; count: number; lastSeen: string }[];
};
