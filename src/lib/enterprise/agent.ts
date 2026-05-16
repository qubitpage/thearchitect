/**
 * Gemini AI Governance Agent — Enterprise Intelligence Layer
 *
 * WHAT THIS IS:
 * An AI agent powered by Google's Gemini models that provides:
 * - Spending analysis and anomaly detection
 * - Compliance verification against policy packs
 * - Risk assessment for transactions and impact data
 * - Document review (contracts, reports, policies)
 * - Policy recommendations based on enterprise data
 *
 * HOW IT WORKS:
 * 1. Enterprise submits an agent task via POST /api/enterprise/agent
 * 2. The agent constructs a structured prompt with enterprise context
 * 3. Prompt goes through Lobster Trap DPI inspection BEFORE reaching Gemini
 * 4. Gemini processes the request and returns structured analysis
 * 5. Response goes through DPI inspection (egress) BEFORE returning
 * 6. Results are stored in the enterprise audit trail
 *
 * GEMINI INTEGRATION:
 * - Uses Gemini Flash for real-time analysis (speed-optimized)
 * - Uses Gemini Pro for complex compliance and document review
 * - All requests go through the Gemini API (google-ai-studio compatible)
 * - API key is set via GEMINI_API_KEY environment variable
 *
 * SECURITY:
 * - Every prompt is DPI-inspected before submission (ingress)
 * - Every response is DPI-inspected before delivery (egress)
 * - Agent tasks are scoped to enterprise tenant
 * - All interactions are audit-logged
 *
 * DEMO MODE:
 * When GEMINI_API_KEY is not set, the agent runs in demo mode with
 * deterministic mock responses that showcase the full analysis pipeline.
 * This is perfect for hackathon demos without requiring API credentials.
 */

import { createId, nowIso } from "@/lib/ids";
import type { AgentResult, AgentTask } from "@/lib/enterprise/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type TaskType = AgentTask["type"];

// ─── Prompt Templates ───────────────────────────────────────

function buildSystemPrompt(taskType: TaskType): string {
  const base = `You are The Architect Governance Agent, an AI analyst for enterprise governance, compliance, and risk management. You provide structured analysis with clear findings, severity ratings, and actionable recommendations. Always cite specific data points in your analysis.`;

  const taskInstructions: Record<TaskType, string> = {
    analyze_spending: `${base}\n\nTask: Analyze spending patterns for anomalies, unusual counterparties, budget overruns, and procurement irregularities. Flag any transactions that deviate from normal patterns.`,
    compliance_check: `${base}\n\nTask: Verify compliance against the enterprise's active policy pack. Check for regulatory violations, missing documentation, policy gaps, and areas of non-compliance. Reference specific regulation clauses.`,
    risk_assessment: `${base}\n\nTask: Assess organizational risk across financial, operational, reputational, and compliance dimensions. Score each risk area and provide mitigation strategies.`,
    document_review: `${base}\n\nTask: Review the provided document for governance implications, compliance requirements, risk factors, and recommended actions. Extract key obligations and deadlines.`,
    anomaly_detection: `${base}\n\nTask: Detect anomalies in the provided data. Look for statistical outliers, unusual patterns, temporal anomalies, and data integrity issues. Quantify the deviation from expected values.`,
    policy_recommendation: `${base}\n\nTask: Based on the enterprise's current governance posture, recommend policy improvements, new rules, tighter controls, or relaxed constraints where appropriate. Justify each recommendation.`,
  };

  return taskInstructions[taskType];
}

// ─── Gemini API Call ────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  userContent: string,
): Promise<{ text: string; tokensUsed: number; model: string }> {
  if (!GEMINI_API_KEY) {
    return { text: "", tokensUsed: 0, model: "demo" };
  }

  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  severity: { type: "string", enum: ["info", "warning", "critical"] },
                  description: { type: "string" },
                  evidence: { type: "string" },
                  remediation: { type: "string" },
                },
                required: ["category", "severity", "description"],
              },
            },
            riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
            recommendations: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
          },
          required: ["summary", "findings", "riskLevel", "recommendations", "confidence"],
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { totalTokenCount?: number };
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const tokensUsed = data.usageMetadata?.totalTokenCount ?? 0;

  return { text, tokensUsed, model: GEMINI_MODEL };
}

// ─── Demo Mode Analysis ─────────────────────────────────────

function generateDemoResult(taskType: TaskType, input: string): AgentResult {
  const demoResults: Record<TaskType, () => AgentResult> = {
    analyze_spending: () => ({
      summary: `Spending analysis completed. Reviewed input data and identified ${2 + Math.floor(input.length / 100)} patterns requiring attention. The primary concern is concentrated counterparty exposure and procurement timing anomalies.`,
      findings: [
        {
          category: "Counterparty Concentration",
          severity: "warning",
          description: "Over 40% of procurement spend is directed to fewer than 3 counterparties, creating concentration risk.",
          evidence: "Based on transaction pattern analysis of submitted data",
          remediation: "Implement vendor diversification policy with max 25% spend per counterparty",
        },
        {
          category: "Timing Anomaly",
          severity: "info",
          description: "Quarter-end spending spikes detected — 60% of annual procurement occurs in the final 2 weeks of each quarter.",
          evidence: "Temporal distribution analysis of transaction timestamps",
          remediation: "Review budget cycle and encourage distributed procurement throughout the quarter",
        },
        {
          category: "Classification Gap",
          severity: "warning",
          description: "12% of transactions are classified as 'public' but contain references to security-sensitive categories.",
          evidence: "Cross-reference of classification field vs category/purpose text analysis",
          remediation: "Audit classification criteria and implement automated classification suggestions",
        },
      ],
      riskLevel: "medium",
      recommendations: [
        "Implement automated vendor diversification alerts at 30% concentration threshold",
        "Create quarterly procurement review checkpoints to smooth spending distribution",
        "Deploy automated classification validation using The Architect's DPI engine",
        "Establish independent procurement audit committee with quarterly reporting",
      ],
      confidence: 0.87,
      model: "demo-gemini-flash",
      tokensUsed: 1247,
    }),

    compliance_check: () => ({
      summary: `Compliance verification completed against active policy pack. Found ${1 + Math.floor(input.length / 200)} areas requiring remediation and ${2} areas exceeding requirements.`,
      findings: [
        {
          category: "Data Retention",
          severity: "critical",
          description: "Audit events lack cryptographic timestamps required for regulatory compliance. Events use ISO timestamps but no trusted timestamping authority (TSA) signatures.",
          evidence: "Audit chain analysis — hashes present but no RFC 3161 TSA integration",
          remediation: "Integrate a Trusted Timestamping Authority for audit event signatures",
        },
        {
          category: "Access Logging",
          severity: "warning",
          description: "Read-only API access (GET endpoints) is not logged in the audit trail. Compliance requires all data access to be recorded.",
          evidence: "Audit event type analysis — only write operations generate events",
          remediation: "Add access logging middleware for all API routes including read operations",
        },
        {
          category: "DPI Coverage",
          severity: "info",
          description: "Lobster Trap DPI inspection covers 100% of AI agent interactions with declared-vs-detected intent analysis — exceeds most compliance frameworks.",
          evidence: "Policy engine configuration review",
        },
      ],
      riskLevel: "high",
      recommendations: [
        "Priority 1: Implement RFC 3161 Trusted Timestamping for all audit events",
        "Priority 2: Add comprehensive access logging for read operations",
        "Maintain current DPI coverage — it exceeds baseline requirements",
        "Schedule quarterly compliance review with external auditor",
      ],
      confidence: 0.92,
      model: "demo-gemini-pro",
      tokensUsed: 1832,
    }),

    risk_assessment: () => ({
      summary: `Enterprise risk assessment completed across 4 dimensions. Overall risk posture: Medium. Strong security controls but operational gaps in data persistence and access governance.`,
      findings: [
        {
          category: "Financial Risk",
          severity: "warning",
          description: "Risk scoring algorithm covers major patterns but lacks sector-specific thresholds. Healthcare and defense transactions use the same scoring model.",
          remediation: "Implement sector-specific risk scoring with configurable thresholds per enterprise",
        },
        {
          category: "Operational Risk",
          severity: "warning",
          description: "In-memory data store with JSON file persistence creates single-point-of-failure risk. No backup or replication strategy.",
          remediation: "Migrate to PostgreSQL with automated backups and replication",
        },
        {
          category: "Security Risk",
          severity: "info",
          description: "DPI Lobster Trap engine provides strong content security. SHA-256 audit chain provides tamper evidence. RBAC covers 7 roles with granular permissions.",
          evidence: "Security architecture review",
        },
        {
          category: "Compliance Risk",
          severity: "warning",
          description: "No automated compliance reporting. Audit data exists but requires manual extraction for regulatory submissions.",
          remediation: "Build automated compliance report generation with scheduled exports",
        },
      ],
      riskLevel: "medium",
      recommendations: [
        "Implement sector-specific risk scoring models (healthcare, finance, defense)",
        "Migrate data persistence to PostgreSQL with automated backup strategy",
        "Build automated compliance reporting pipeline",
        "Add real-time alerting for critical-severity audit events",
      ],
      confidence: 0.89,
      model: "demo-gemini-pro",
      tokensUsed: 2156,
    }),

    document_review: () => ({
      summary: `Document review completed. Extracted ${3 + Math.floor(input.length / 150)} governance implications and ${2} compliance requirements. Key attention areas: data handling obligations and reporting deadlines.`,
      findings: [
        {
          category: "Data Handling Obligations",
          severity: "warning",
          description: "Document references personal data processing without specifying lawful basis. Under GDPR Article 6, a legal basis must be documented.",
          remediation: "Add explicit legal basis documentation for each data processing activity",
        },
        {
          category: "Reporting Deadline",
          severity: "critical",
          description: "Document implies quarterly compliance reporting obligation with 15-day submission window. No automated reporting mechanism currently exists.",
          remediation: "Configure automated compliance report generation before deadline",
        },
      ],
      riskLevel: "medium",
      recommendations: [
        "Document legal basis for all data processing activities",
        "Set up automated quarterly compliance report generation",
        "Create document tracking system for obligation management",
      ],
      confidence: 0.84,
      model: "demo-gemini-flash",
      tokensUsed: 987,
    }),

    anomaly_detection: () => ({
      summary: `Anomaly detection completed. Identified ${2} statistical anomalies and ${1} temporal pattern deviation across the analyzed dataset.`,
      findings: [
        {
          category: "Statistical Outlier",
          severity: "warning",
          description: "Transaction amount distribution shows a 3.2σ deviation in recent entries. Mean spend increased 140% compared to 90-day rolling average.",
          evidence: "Z-score analysis of transaction amounts",
          remediation: "Investigate recent high-value transactions and verify procurement justification",
        },
        {
          category: "Pattern Deviation",
          severity: "info",
          description: "Impact reporting frequency changed from quarterly to monthly for 2 actors — may indicate increased regulatory scrutiny or proactive compliance.",
          evidence: "Temporal frequency analysis of impact ledger entries",
        },
      ],
      riskLevel: "medium",
      recommendations: [
        "Set up automated anomaly alerts for transactions exceeding 2σ from rolling average",
        "Monitor reporting frequency changes as early indicators of regulatory attention",
        "Implement real-time dashboarding for key anomaly metrics",
      ],
      confidence: 0.91,
      model: "demo-gemini-flash",
      tokensUsed: 1104,
    }),

    policy_recommendation: () => ({
      summary: `Policy analysis completed. Recommending ${3} new policy rules and ${1} policy relaxation based on enterprise governance posture and threat landscape analysis.`,
      findings: [
        {
          category: "Missing Policy: Seasonal Patterns",
          severity: "warning",
          description: "No policy rule addresses seasonal spending pattern validation. Quarter-end spending spikes could mask anomalous transactions.",
          remediation: "Add temporal analysis rule: flag transactions >200% of daily average in final 5 business days of quarter",
        },
        {
          category: "Missing Policy: Cross-Jurisdiction",
          severity: "warning",
          description: "Multi-jurisdiction operations lack cross-border data flow policies. Transactions referencing multiple jurisdictions should trigger review.",
          remediation: "Add cross-jurisdiction transaction review rule for amounts >€100,000",
        },
        {
          category: "Overly Restrictive: Fabrication Rule",
          severity: "info",
          description: "Fabrication detection rule triggers on legitimate research discussions. False positive rate estimated at 15%.",
          remediation: "Narrow pattern scope and add context-aware exemptions for academic/research use cases",
        },
      ],
      riskLevel: "low",
      recommendations: [
        "Add temporal spending anomaly detection rule (quarter-end spike protection)",
        "Implement cross-jurisdiction transaction review for high-value transfers",
        "Refine fabrication detection to reduce false positives in research contexts",
        "Schedule quarterly policy pack review to keep rules aligned with threat landscape",
      ],
      confidence: 0.88,
      model: "demo-gemini-pro",
      tokensUsed: 1567,
    }),
  };

  return demoResults[taskType]();
}

// ─── Main Agent Execution ───────────────────────────────────

export async function executeAgentTask(
  enterpriseId: string,
  taskType: TaskType,
  input: string,
  context?: Record<string, unknown>,
): Promise<AgentTask> {
  const task: AgentTask = {
    id: createId("task"),
    enterpriseId,
    type: taskType,
    input,
    context,
    status: "running",
    createdAt: nowIso(),
  };

  try {
    let result: AgentResult;

    if (!GEMINI_API_KEY) {
      // Demo mode — deterministic results for hackathon demo
      result = generateDemoResult(taskType, input);
    } else {
      // Live Gemini mode
      const systemPrompt = buildSystemPrompt(taskType);
      const geminiResponse = await callGemini(systemPrompt, input);

      if (geminiResponse.model === "demo") {
        result = generateDemoResult(taskType, input);
      } else {
        try {
          const parsed = JSON.parse(geminiResponse.text) as Omit<AgentResult, "model" | "tokensUsed">;
          result = {
            ...parsed,
            model: geminiResponse.model,
            tokensUsed: geminiResponse.tokensUsed,
          };
        } catch {
          result = {
            summary: geminiResponse.text.slice(0, 500),
            findings: [{ category: "Raw Response", severity: "info", description: geminiResponse.text }],
            riskLevel: "low",
            recommendations: ["Review raw response for detailed analysis"],
            confidence: 0.5,
            model: geminiResponse.model,
            tokensUsed: geminiResponse.tokensUsed,
          };
        }
      }
    }

    task.status = "completed";
    task.result = result;
    task.completedAt = nowIso();
  } catch (error) {
    task.status = "failed";
    task.result = {
      summary: `Agent task failed: ${error instanceof Error ? error.message : String(error)}`,
      findings: [{ category: "Error", severity: "critical", description: String(error) }],
      riskLevel: "high",
      recommendations: ["Retry the task or check API connectivity"],
      confidence: 0,
      model: "error",
      tokensUsed: 0,
    };
    task.completedAt = nowIso();
  }

  return task;
}
