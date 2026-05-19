/**
 * Enterprise Service — Multi-Tenant Governance SaaS
 *
 * Core operations for enterprise registration, authentication,
 * CorpLedger, Merit Protocol, Voting, and tenant-scoped metrics.
 *
 * Connected to: DPI Engine, Audit Chain, Impact Ledger, Event Bus
 */

import { db, schema } from "@/lib/db";
import { emit, EventTypes } from "@/lib/core/event-bus";
import { eq, desc, and, count as drizzleCount, avg, sum } from "drizzle-orm";

// ─── Helpers ────────────────────────────────────────────────

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function generateApiKey(): string {
  return `ark_${crypto.randomUUID().replace(/-/g, "")}`;
}

const TIER_QUOTAS: Record<string, number> = {
  pilot: 50,
  starter: 200,
  professional: 1000,
  enterprise: 10000,
};

// ─── Enterprise Registration ────────────────────────────────

export async function registerEnterprise(input: {
  name: string;
  domain: string;
  contactEmail: string;
  industry: string;
  compliancePack: "general" | "hipaa" | "soc2" | "finance" | "custom";
  tier: "pilot" | "starter" | "professional" | "enterprise";
}): Promise<{ enterprise: typeof schema.enterprises.$inferSelect; apiKey: string }> {
  // Check duplicate domain
  const [existing] = await db
    .select()
    .from(schema.enterprises)
    .where(eq(schema.enterprises.domain, input.domain.toLowerCase()))
    .limit(1);

  if (existing) throw new Error(`Enterprise with domain ${input.domain} already registered`);

  const apiKey = generateApiKey();
  const apiKeyHash = await hashKey(apiKey);

  const [enterprise] = await db
    .insert(schema.enterprises)
    .values({
      name: input.name,
      slug: slugify(input.name),
      domain: input.domain.toLowerCase(),
      tier: input.tier,
      status: input.tier === "pilot" ? "trial" : "active",
      compliancePack: input.compliancePack,
      apiKeyHash,
      contactEmail: input.contactEmail,
      industry: input.industry,
      agentQuota: TIER_QUOTAS[input.tier] ?? 50,
      agentsUsed: 0,
    })
    .returning();

  await emit({
    eventType: EventTypes.ENTERPRISE_REGISTERED,
    sourceModule: "enterprise",
    payload: { id: enterprise.id, name: enterprise.name, tier: enterprise.tier },
  });

  return { enterprise, apiKey };
}

// ─── Enterprise Lookup ──────────────────────────────────────

export async function authenticateByApiKey(apiKey: string) {
  const keyHash = await hashKey(apiKey);
  const [enterprise] = await db
    .select()
    .from(schema.enterprises)
    .where(eq(schema.enterprises.apiKeyHash, keyHash))
    .limit(1);
  if (!enterprise || enterprise.status === "deactivated") return null;
  return enterprise;
}

export async function getEnterpriseBySlug(slug: string) {
  const [e] = await db
    .select()
    .from(schema.enterprises)
    .where(eq(schema.enterprises.slug, slug))
    .limit(1);
  return e;
}

export async function getEnterpriseById(id: string) {
  const [e] = await db
    .select()
    .from(schema.enterprises)
    .where(eq(schema.enterprises.id, id))
    .limit(1);
  return e;
}

export async function listEnterprises() {
  const enterprises = await db
    .select()
    .from(schema.enterprises)
    .orderBy(desc(schema.enterprises.createdAt));
  // Redact API key hashes in list
  return enterprises.map((e) => ({ ...e, apiKeyHash: "[REDACTED]" }));
}

// ─── CorpLedger (Corporate Financial Transparency) ──────────

function scoreCorpTransaction(tx: { amount: number; category: string }): {
  score: number;
  flags: string[];
} {
  let score = 0;
  const flags: string[] = [];

  if (tx.amount > 500_000) { score += 25; flags.push("high value"); }
  else if (tx.amount > 100_000) { score += 10; flags.push("significant expenditure"); }

  if (tx.category === "consulting") { score += 15; flags.push("consulting engagement"); }
  if (tx.category === "executive_compensation") { score += 20; flags.push("executive pay"); }
  if (tx.category === "related_party") { score += 30; flags.push("related party transaction"); }

  return { score: Math.min(score, 100), flags };
}

export async function createCorpTransaction(input: {
  enterpriseId: string;
  department: string;
  counterparty: string;
  amount: number;
  currency?: string;
  category: string;
  purpose: string;
  approvedBy?: string;
}) {
  const { score, flags } = scoreCorpTransaction({
    amount: input.amount,
    category: input.category,
  });

  const [tx] = await db
    .insert(schema.corpledgerTransactions)
    .values({
      enterpriseId: input.enterpriseId,
      department: input.department,
      counterparty: input.counterparty,
      amount: input.amount,
      currency: input.currency ?? "EUR",
      category: input.category,
      purpose: input.purpose,
      approvedBy: input.approvedBy,
      riskScore: score,
      flags,
      status: score >= 50 ? "quarantined" : "pending_review",
    })
    .returning();

  await emit({
    eventType: EventTypes.CORPLEDGER_TX_CREATED,
    sourceModule: "enterprise",
    payload: { id: tx.id, enterpriseId: input.enterpriseId, amount: input.amount, riskScore: score },
  });

  return tx;
}

export async function listCorpTransactions(enterpriseId: string, limit = 50) {
  return db
    .select()
    .from(schema.corpledgerTransactions)
    .where(eq(schema.corpledgerTransactions.enterpriseId, enterpriseId))
    .orderBy(desc(schema.corpledgerTransactions.createdAt))
    .limit(limit);
}

export async function reviewCorpTransaction(id: string, action: "accepted" | "rejected" | "quarantined") {
  const [updated] = await db
    .update(schema.corpledgerTransactions)
    .set({ status: action, updatedAt: new Date() })
    .where(eq(schema.corpledgerTransactions.id, id))
    .returning();

  if (updated) {
    await emit({
      eventType: EventTypes.CORPLEDGER_TX_REVIEWED,
      sourceModule: "enterprise",
      payload: { id, status: action, enterpriseId: updated.enterpriseId },
    });
  }

  return updated;
}

// ─── Merit Protocol ─────────────────────────────────────────

export async function submitMeritEvaluation(input: {
  enterpriseId: string;
  candidateId: string;
  positionTitle: string;
  department: string;
  peerScore: number;
  metricsScore: number;
  feedbackScore: number;
  evaluationPeriod: string;
}) {
  // Weighted composite: 40% peer + 40% metrics + 20% 360° feedback
  const compositeScore =
    input.peerScore * 0.4 + input.metricsScore * 0.4 + input.feedbackScore * 0.2;

  // Bias detection
  const biasFlags: string[] = [];
  const spread = Math.abs(input.peerScore - input.metricsScore);
  if (spread > 40) biasFlags.push("large peer-metrics divergence");
  if (input.feedbackScore > 95 && input.metricsScore < 50) biasFlags.push("feedback inflation suspected");
  if (input.peerScore < 20 && input.metricsScore > 80) biasFlags.push("possible peer retaliation");

  const [evaluation] = await db
    .insert(schema.meritEvaluations)
    .values({
      enterpriseId: input.enterpriseId,
      candidateId: input.candidateId,
      positionTitle: input.positionTitle,
      department: input.department,
      peerScore: input.peerScore,
      metricsScore: input.metricsScore,
      feedbackScore: input.feedbackScore,
      compositeScore,
      biasFlags,
      evaluationPeriod: input.evaluationPeriod,
      status: biasFlags.length > 0 ? "quarantined" : "pending_review",
    })
    .returning();

  await emit({
    eventType: biasFlags.length > 0 ? EventTypes.MERIT_BIAS_DETECTED : EventTypes.MERIT_EVALUATION_SUBMITTED,
    sourceModule: "enterprise",
    payload: { id: evaluation.id, enterpriseId: input.enterpriseId, compositeScore, biasFlags },
  });

  return evaluation;
}

export async function listMeritEvaluations(enterpriseId: string, limit = 50) {
  return db
    .select()
    .from(schema.meritEvaluations)
    .where(eq(schema.meritEvaluations.enterpriseId, enterpriseId))
    .orderBy(desc(schema.meritEvaluations.createdAt))
    .limit(limit);
}

// ─── Employee Democracy (Liquid Voting) ─────────────────────

export async function createProposal(input: {
  enterpriseId: string;
  title: string;
  description: string;
  category: string;
  proposedBy: string;
  requiredQuorum?: number;
  employeeWeight?: number;
  totalEligible: number;
  closesAt?: string;
}) {
  const [proposal] = await db
    .insert(schema.votingProposals)
    .values({
      enterpriseId: input.enterpriseId,
      title: input.title,
      description: input.description,
      category: input.category,
      proposedBy: input.proposedBy,
      requiredQuorum: input.requiredQuorum ?? 0.5,
      employeeWeight: input.employeeWeight ?? 0.2,
      totalEligible: input.totalEligible,
      closesAt: input.closesAt ? new Date(input.closesAt) : null,
    })
    .returning();

  await emit({
    eventType: EventTypes.VOTING_PROPOSAL_CREATED,
    sourceModule: "enterprise",
    payload: { id: proposal.id, enterpriseId: input.enterpriseId, title: input.title, category: input.category },
  });

  return proposal;
}

export async function castVote(input: {
  proposalId: string;
  voterId: string;
  voterType: "employee" | "shareholder" | "delegate";
  vote: "for" | "against" | "abstain";
  weight?: number;
  delegatedFrom?: string;
}) {
  // Upsert vote (one vote per voter per proposal, enforced by unique index)
  const [vote] = await db
    .insert(schema.votes)
    .values({
      proposalId: input.proposalId,
      voterId: input.voterId,
      voterType: input.voterType,
      vote: input.vote,
      weight: input.weight ?? 1,
      delegatedFrom: input.delegatedFrom,
    })
    .onConflictDoUpdate({
      target: [schema.votes.proposalId, schema.votes.voterId],
      set: { vote: input.vote, weight: input.weight ?? 1 },
    })
    .returning();

  // Update proposal tallies
  const votes = await db
    .select()
    .from(schema.votes)
    .where(eq(schema.votes.proposalId, input.proposalId));

  const votesFor = votes.filter((v) => v.vote === "for").reduce((s, v) => s + v.weight, 0);
  const votesAgainst = votes.filter((v) => v.vote === "against").reduce((s, v) => s + v.weight, 0);
  const votesAbstain = votes.filter((v) => v.vote === "abstain").reduce((s, v) => s + v.weight, 0);

  await db
    .update(schema.votingProposals)
    .set({
      votesFor: Math.round(votesFor),
      votesAgainst: Math.round(votesAgainst),
      votesAbstain: Math.round(votesAbstain),
      updatedAt: new Date(),
    })
    .where(eq(schema.votingProposals.id, input.proposalId));

  await emit({
    eventType: EventTypes.VOTING_VOTE_CAST,
    sourceModule: "enterprise",
    payload: { proposalId: input.proposalId, voterId: input.voterId, vote: input.vote },
  });

  return vote;
}

export async function closeProposal(proposalId: string) {
  const [proposal] = await db
    .select()
    .from(schema.votingProposals)
    .where(eq(schema.votingProposals.id, proposalId))
    .limit(1);

  if (!proposal) return null;

  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const quorumMet = totalVotes / Math.max(proposal.totalEligible, 1) >= proposal.requiredQuorum;
  const approved = quorumMet && proposal.votesFor > proposal.votesAgainst;

  const [updated] = await db
    .update(schema.votingProposals)
    .set({
      status: quorumMet ? (approved ? "approved" : "rejected") : "rejected",
      updatedAt: new Date(),
    })
    .where(eq(schema.votingProposals.id, proposalId))
    .returning();

  await emit({
    eventType: EventTypes.VOTING_PROPOSAL_CLOSED,
    sourceModule: "enterprise",
    payload: {
      id: proposalId,
      result: updated.status,
      quorumMet,
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
    },
  });

  return updated;
}

export async function listProposals(enterpriseId: string, limit = 20) {
  return db
    .select()
    .from(schema.votingProposals)
    .where(eq(schema.votingProposals.enterpriseId, enterpriseId))
    .orderBy(desc(schema.votingProposals.createdAt))
    .limit(limit);
}

// ─── Agent Tasks (Gemini AI) ────────────────────────────────

export async function createAgentTask(input: {
  enterpriseId: string;
  type: "analyze_spending" | "compliance_check" | "risk_assessment" | "document_review" | "anomaly_detection" | "policy_recommendation";
  input: string;
  context?: Record<string, unknown>;
}) {
  // Check quota
  const enterprise = await getEnterpriseById(input.enterpriseId);
  if (!enterprise) throw new Error("Enterprise not found");
  if (enterprise.agentsUsed >= enterprise.agentQuota) {
    throw new Error(`Agent quota exceeded (${enterprise.agentQuota} tasks for ${enterprise.tier} tier)`);
  }

  const [task] = await db
    .insert(schema.agentTasks)
    .values({
      enterpriseId: input.enterpriseId,
      type: input.type,
      input: input.input,
      context: input.context ?? {},
      status: "pending",
    })
    .returning();

  // Increment usage
  await db
    .update(schema.enterprises)
    .set({ agentsUsed: enterprise.agentsUsed + 1, updatedAt: new Date() })
    .where(eq(schema.enterprises.id, input.enterpriseId));

  return task;
}

export async function completeAgentTask(taskId: string, result: NonNullable<typeof schema.agentTasks.$inferSelect.result>) {
  const [updated] = await db
    .update(schema.agentTasks)
    .set({
      status: "completed",
      result,
      completedAt: new Date(),
    })
    .where(eq(schema.agentTasks.id, taskId))
    .returning();

  if (updated) {
    await emit({
      eventType: EventTypes.ENTERPRISE_AGENT_TASK,
      sourceModule: "enterprise",
      payload: { id: taskId, enterpriseId: updated.enterpriseId, type: updated.type, riskLevel: result.riskLevel },
    });
  }

  return updated;
}

export async function listAgentTasks(enterpriseId: string, limit = 20) {
  return db
    .select()
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.enterpriseId, enterpriseId))
    .orderBy(desc(schema.agentTasks.createdAt))
    .limit(limit);
}

// ─── Enterprise Metrics (Dashboard) ─────────────────────────

export async function getEnterpriseMetrics(enterpriseId: string) {
  // DPI inspections
  const inspections = await db
    .select()
    .from(schema.dpiInspections)
    .where(eq(schema.dpiInspections.enterpriseId, enterpriseId));

  const blocked = inspections.filter((i) => i.action === "DENY" || i.action === "QUARANTINE").length;
  const allowed = inspections.filter((i) => i.action === "ALLOW" || i.action === "LOG").length;
  const humanReview = inspections.filter((i) => i.action === "HUMAN_REVIEW").length;

  const piiBlocked = inspections.filter(
    (i) => i.lobsterTrapMeta && (i.lobsterTrapMeta as Record<string, unknown>).piiDetected && i.action !== "ALLOW"
  ).length;
  const exfiltration = inspections.filter(
    (i) => i.lobsterTrapMeta && (i.lobsterTrapMeta as Record<string, unknown>).exfiltrationRisk
  ).length;

  const avgRisk = inspections.length
    ? Math.round(inspections.reduce((s, i) => s + i.riskScore, 0) / inspections.length)
    : 0;

  // Compliance score
  const complianceScore = Math.max(0, Math.min(100,
    100 - Math.round((blocked / Math.max(inspections.length, 1)) * 100)
  ));

  // Agent tasks
  const [taskMetrics] = await db
    .select({ completed: drizzleCount() })
    .from(schema.agentTasks)
    .where(and(
      eq(schema.agentTasks.enterpriseId, enterpriseId),
      eq(schema.agentTasks.status, "completed"),
    ));

  // CorpLedger
  const [corpMetrics] = await db
    .select({
      count: drizzleCount(),
      totalSpend: sum(schema.corpledgerTransactions.amount),
    })
    .from(schema.corpledgerTransactions)
    .where(eq(schema.corpledgerTransactions.enterpriseId, enterpriseId));

  // Merit evaluations
  const [meritMetrics] = await db
    .select({ count: drizzleCount(), avgScore: avg(schema.meritEvaluations.compositeScore) })
    .from(schema.meritEvaluations)
    .where(eq(schema.meritEvaluations.enterpriseId, enterpriseId));

  // Voting proposals
  const [votingMetrics] = await db
    .select({ count: drizzleCount() })
    .from(schema.votingProposals)
    .where(eq(schema.votingProposals.enterpriseId, enterpriseId));

  // Top threats
  const threatCounts = new Map<string, { count: number; lastSeen: string }>();
  for (const insp of inspections) {
    for (const rule of insp.matchedRules as string[]) {
      const existing = threatCounts.get(rule);
      const ts = insp.createdAt.toISOString();
      if (!existing || ts > existing.lastSeen) {
        threatCounts.set(rule, { count: (existing?.count ?? 0) + 1, lastSeen: ts });
      }
    }
  }
  const topThreats = [...threatCounts.entries()]
    .map(([rule, data]) => ({ rule, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    // DPI
    totalInspections: inspections.length,
    blockedThreats: blocked,
    allowedRequests: allowed,
    humanReviewPending: humanReview,
    complianceScore,
    averageRiskScore: avgRisk,
    piiExposuresBlocked: piiBlocked,
    exfiltrationAttempts: exfiltration,
    // Agent
    agentTasksCompleted: taskMetrics?.completed ?? 0,
    // CorpLedger
    corpTransactions: corpMetrics?.count ?? 0,
    corpTotalSpend: Number(corpMetrics?.totalSpend ?? 0),
    // Merit
    meritEvaluations: meritMetrics?.count ?? 0,
    meritAvgScore: Math.round(Number(meritMetrics?.avgScore ?? 0)),
    // Voting
    proposals: votingMetrics?.count ?? 0,
    // Threats
    topThreats,
  };
}

// ─── Enterprise Snapshot (Full Dashboard Data) ──────────────

export async function getEnterpriseSnapshot(slug: string) {
  const enterprise = await getEnterpriseBySlug(slug);
  if (!enterprise) return null;

  const metrics = await getEnterpriseMetrics(enterprise.id);

  const recentInspections = await db
    .select()
    .from(schema.dpiInspections)
    .where(eq(schema.dpiInspections.enterpriseId, enterprise.id))
    .orderBy(desc(schema.dpiInspections.createdAt))
    .limit(20);

  const recentTasks = await listAgentTasks(enterprise.id, 10);
  const recentCorpTx = await listCorpTransactions(enterprise.id, 10);
  const recentMerit = await listMeritEvaluations(enterprise.id, 10);
  const recentProposals = await listProposals(enterprise.id, 10);

  // Compute top threats from inspections
  const threatCounts = new Map<string, { count: number; lastSeen: string }>();
  for (const insp of recentInspections) {
    const rules = (insp.matchedRules ?? []) as string[];
    for (const rule of rules) {
      const existing = threatCounts.get(rule);
      const ts = insp.createdAt?.toISOString() ?? new Date().toISOString();
      if (!existing || ts > existing.lastSeen) {
        threatCounts.set(rule, {
          count: (existing?.count ?? 0) + 1,
          lastSeen: ts,
        });
      }
    }
  }
  const topThreats = Array.from(threatCounts.entries())
    .map(([rule, data]) => ({ rule, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Build a simple policy pack summary
  const policyPack = {
    id: enterprise.compliancePack,
    name: `${enterprise.compliancePack.toUpperCase()} Compliance Pack`,
    description: `DPI rules for ${enterprise.compliancePack} compliance`,
    version: "1.0.0",
    compliance: enterprise.compliancePack,
    rules: [] as unknown[],
  };

  return {
    enterprise: { ...enterprise, apiKeyHash: "[REDACTED]" },
    metrics,
    recentInspections,
    recentTasks,
    recentCorpTransactions: recentCorpTx,
    recentMeritEvaluations: recentMerit,
    recentProposals,
    policyPack,
    topThreats,
  };
}
