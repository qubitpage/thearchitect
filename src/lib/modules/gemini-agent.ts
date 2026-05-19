/**
 * Gemini AI Governance Agent — Enterprise AI Analysis
 *
 * Uses Google Gemini for intelligent governance analysis.
 * Every request is DPI-inspected (ingress + egress).
 * Falls back to demo mode when GEMINI_API_KEY is not set.
 */

import { inspect } from "@/lib/core/dpi-engine";
import { completeAgentTask } from "@/lib/modules/enterprise";

type AgentInput = {
  taskId: string;
  enterpriseId: string;
  compliancePack: string;
  type: string;
  input: string;
  context?: Record<string, unknown>;
};

type AgentResult = {
  summary: string;
  findings: Array<{
    category: string;
    severity: "info" | "warning" | "critical";
    description: string;
    evidence?: string;
    remediation?: string;
  }>;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
  confidence: number;
  model: string;
  tokensUsed: number;
};

// ─── Demo Results (when no API key) ─────────────────────────

function generateDemoResult(type: string, input: string): AgentResult {
  const demos: Record<string, AgentResult> = {
    analyze_spending: {
      summary: `Spending analysis completed for input: "${input.slice(0, 80)}..."`,
      findings: [
        { category: "Counterparty Concentration", severity: "warning", description: "Top 3 vendors account for 72% of total procurement spend. Single-source risk detected.", evidence: "Procurement data analysis — vendor diversity index 0.28 (below 0.40 threshold)", remediation: "Implement vendor diversification policy with 40% maximum single-vendor share" },
        { category: "Timing Anomalies", severity: "info", description: "End-of-quarter spending spike detected — 340% above monthly average in March.", evidence: "Transaction timeline analysis", remediation: "Review budget allocation patterns for smoothing" },
      ],
      riskLevel: "medium",
      recommendations: ["Diversify vendor base to reduce concentration risk", "Implement quarterly spend smoothing policy", "Add automated alerts for single-vendor share >35%"],
      confidence: 0.87,
      model: "demo-mode",
      tokensUsed: 0,
    },
    compliance_check: {
      summary: `Compliance verification completed for ${input.slice(0, 80)}...`,
      findings: [
        { category: "Data Retention", severity: "critical", description: "Audit events lack cryptographic timestamps from a Trusted Timestamping Authority.", evidence: "Audit chain analysis — hashes present but no RFC 3161 TSA", remediation: "Integrate Trusted Timestamping Authority for all audit events" },
        { category: "Access Control", severity: "warning", description: "3 dormant accounts with elevated privileges detected.", evidence: "RBAC audit — accounts inactive >90 days", remediation: "Implement automatic privilege revocation for 90-day inactive accounts" },
      ],
      riskLevel: "high",
      recommendations: ["Priority 1: Implement RFC 3161 TSA integration", "Priority 2: Auto-revoke dormant elevated accounts", "Priority 3: Schedule quarterly access reviews"],
      confidence: 0.92,
      model: "demo-mode",
      tokensUsed: 0,
    },
    risk_assessment: {
      summary: `Multi-dimensional risk scoring completed.`,
      findings: [
        { category: "Financial Risk", severity: "warning", description: "Accounts receivable aging exceeds 90 days for 23% of outstanding invoices.", remediation: "Implement automated collection escalation at 60 days" },
        { category: "Operational Risk", severity: "info", description: "Business continuity plan not tested in 18 months.", remediation: "Schedule DR/BC test within 30 days" },
        { category: "Security Risk", severity: "critical", description: "API keys rotated only annually — industry standard is 90 days.", remediation: "Implement 90-day automatic key rotation" },
      ],
      riskLevel: "high",
      recommendations: ["Rotate all API keys to 90-day cycle", "Test business continuity plan", "Automate receivables collection", "Add real-time risk scoring dashboard"],
      confidence: 0.85,
      model: "demo-mode",
      tokensUsed: 0,
    },
    document_review: {
      summary: `Document governance review completed.`,
      findings: [
        { category: "Obligations", severity: "warning", description: "Identified 4 compliance obligations with deadlines in next 30 days.", remediation: "Create tracking dashboard for obligation deadlines" },
        { category: "Risk Factors", severity: "info", description: "Document contains 2 ambiguous liability clauses.", remediation: "Legal review recommended for sections 4.2 and 7.1" },
      ],
      riskLevel: "medium",
      recommendations: ["Track upcoming obligation deadlines", "Review ambiguous clauses with legal team", "Implement document version control"],
      confidence: 0.78,
      model: "demo-mode",
      tokensUsed: 0,
    },
    anomaly_detection: {
      summary: `Statistical anomaly scan completed.`,
      findings: [
        { category: "Transaction Outliers", severity: "warning", description: "7 transactions deviate >3σ from historical patterns.", evidence: "Z-score analysis on 90-day rolling window", remediation: "Manual review of flagged transactions" },
        { category: "Access Patterns", severity: "critical", description: "Service account accessed sensitive data at 3:47 AM — outside normal operating hours.", evidence: "Access log temporal analysis", remediation: "Implement time-based access controls for service accounts" },
      ],
      riskLevel: "high",
      recommendations: ["Review flagged outlier transactions", "Restrict service account access hours", "Add anomaly alerting to real-time monitoring"],
      confidence: 0.91,
      model: "demo-mode",
      tokensUsed: 0,
    },
    policy_recommendation: {
      summary: `Policy improvement analysis completed.`,
      findings: [
        { category: "Missing Controls", severity: "warning", description: "No policy covering AI model deployment governance.", remediation: "Draft AI deployment policy with review gates and bias testing requirements" },
        { category: "Outdated Policies", severity: "info", description: "3 policies reference deprecated regulatory frameworks.", remediation: "Update references to current regulatory editions" },
      ],
      riskLevel: "low",
      recommendations: ["Create AI governance policy", "Update deprecated regulatory references", "Implement annual policy review cycle", "Add policy effectiveness metrics"],
      confidence: 0.82,
      model: "demo-mode",
      tokensUsed: 0,
    },
  };

  return demos[type] ?? demos.risk_assessment;
}

// ─── Live Gemini Call ───────────────────────────────────────

async function callGemini(type: string, input: string, context?: Record<string, unknown>): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return generateDemoResult(type, input);

  const systemPrompt = `You are a governance compliance AI agent for The Architect platform. 
Your task type is: ${type}. Analyze the following input and return a structured JSON response with:
- summary (string): Brief analysis summary
- findings (array): Each with category, severity (info|warning|critical), description, evidence?, remediation?
- riskLevel (string): low|medium|high|critical
- recommendations (string array): Prioritized action items
- confidence (number): 0-1

Be specific, evidence-based, and actionable. Reference relevant regulations where applicable.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\nInput: ${input}\n\nContext: ${JSON.stringify(context ?? {})}` }] },
          ],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }),
      },
    );

    if (!res.ok) return generateDemoResult(type, input);

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const tokensUsed = data.usageMetadata?.totalTokenCount ?? 0;

    // Try to parse structured JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, model: "gemini-2.0-flash", tokensUsed };
    }

    return {
      summary: text.slice(0, 500),
      findings: [],
      riskLevel: "medium",
      recommendations: [text.slice(0, 200)],
      confidence: 0.5,
      model: "gemini-2.0-flash",
      tokensUsed,
    };
  } catch {
    return generateDemoResult(type, input);
  }
}

// ─── Execute Agent Task (with DPI) ──────────────────────────

export async function executeAgentTask(task: AgentInput): Promise<AgentResult> {
  // 1. Ingress DPI — inspect the user's input
  const ingressResult = await inspect({
    content: task.input,
    direction: "ingress",
    actor: `enterprise:${task.enterpriseId}`,
    enterpriseId: task.enterpriseId,
    compliancePack: task.compliancePack as "general" | "hipaa" | "soc2" | "finance",
  });

  if (ingressResult.action === "DENY") {
    const blockedResult: AgentResult = {
      summary: "Request blocked by DPI inspection",
      findings: [{ category: "Security", severity: "critical", description: `Ingress blocked: ${ingressResult.matchedRules.join(", ")}`, remediation: "Review and sanitize the request content" }],
      riskLevel: "critical",
      recommendations: ["Remove flagged content from the request"],
      confidence: 1,
      model: "dpi-blocked",
      tokensUsed: 0,
    };
    await completeAgentTask(task.taskId, blockedResult);
    return blockedResult;
  }

  // 2. Execute analysis
  const result = await callGemini(task.type, task.input, task.context);

  // 3. Egress DPI — inspect the AI output
  const egressResult = await inspect({
    content: result.summary + " " + result.recommendations.join(" "),
    direction: "egress",
    actor: `agent:${task.type}`,
    enterpriseId: task.enterpriseId,
    compliancePack: task.compliancePack as "general" | "hipaa" | "soc2" | "finance",
  });

  if (egressResult.action === "DENY" || egressResult.action === "QUARANTINE") {
    result.summary = "[REDACTED — egress DPI flagged potentially unsafe content]";
    result.findings.push({
      category: "Security",
      severity: "warning",
      description: `AI output flagged by egress DPI: ${egressResult.matchedRules.join(", ")}`,
    });
  }

  // 4. Save result
  await completeAgentTask(task.taskId, result);

  return result;
}
