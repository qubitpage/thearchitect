/**
 * DPI Engine — Deep Prompt Inspection (Lobster Trap integration)
 *
 * 18 rules across 4 compliance packs. Regex-based classification,
 * no LLM calls for inspection. Sub-millisecond evaluation.
 *
 * Connected to: Event Bus (emits threats), Audit Chain (logs all inspections),
 * Enterprise module (tenant-scoped packs).
 */

import { db, schema } from "@/lib/db";
import { emit, EventTypes } from "@/lib/core/event-bus";
import type { policyAction } from "@/lib/db/schema";

type PolicyAction = (typeof policyAction.enumValues)[number];

type InspectionInput = {
  content: string;
  direction: "ingress" | "egress";
  actor?: string;
  declaredIntent?: string;
  enterpriseId?: string;
  compliancePack?: "general" | "hipaa" | "soc2" | "finance" | "custom";
};

type InspectionResult = {
  id: string;
  action: "ALLOW" | "DENY" | "LOG" | "HUMAN_REVIEW" | "QUARANTINE" | "RATE_LIMIT";
  riskScore: number;
  matchedRules: string[];
  redactedPreview: string;
  lobsterTrapMeta: {
    declaredIntent?: string;
    detectedIntent: string;
    intentMatch: boolean;
    extractedEntities: string[];
    piiDetected: boolean;
    credentialsDetected: boolean;
    exfiltrationRisk: boolean;
  };
};

// ─── Rule Definitions ───────────────────────────────────────

type DpiRule = {
  id: string;
  name: string;
  description: string;
  direction: "ingress" | "egress" | "both";
  pattern: RegExp;
  score: number;
  action: InspectionResult["action"];
  tags: string[];
  packs: string[]; // which compliance packs include this rule
};

const BASE_RULES: DpiRule[] = [
  {
    id: "dpi-001", name: "Prompt Injection",
    description: "Detects prompt injection attempts including role override and system prompt extraction",
    direction: "ingress", score: 90, action: "DENY",
    pattern: /(?:ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions|you\s+are\s+now|system\s*prompt|override\s+(?:your|the)\s+(?:rules|instructions)|jailbreak|DAN\s+mode|developer\s+mode|act\s+as\s+(?:if\s+)?(?:you\s+(?:have|had)\s+)?no\s+(?:rules|restrictions|limitations))/i,
    tags: ["injection", "security"], packs: ["general", "hipaa", "soc2", "finance"],
  },
  {
    id: "dpi-002", name: "Credential Leak",
    description: "Blocks API keys, passwords, tokens, and secrets in any direction",
    direction: "both", score: 95, action: "DENY",
    pattern: /(?:(?:api[_-]?key|secret[_-]?key|access[_-]?token|bearer\s+token|password|passwd|private[_-]?key)\s*[:=]\s*\S{8,}|(?:sk-|pk-|ghp_|gho_|glpat-|xoxb-|xoxp-|AKIA)\w{10,}|-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/i,
    tags: ["credentials", "leak"], packs: ["general", "hipaa", "soc2", "finance"],
  },
  {
    id: "dpi-003", name: "PII Exposure",
    description: "Detects SSN, credit cards, phone numbers, and email patterns",
    direction: "both", score: 75, action: "HUMAN_REVIEW",
    pattern: /(?:\b\d{3}-\d{2}-\d{4}\b|\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b)/i,
    tags: ["pii", "privacy"], packs: ["general", "hipaa", "soc2", "finance"],
  },
  {
    id: "dpi-004", name: "Data Exfiltration",
    description: "Detects attempts to send data to external URLs or encode for extraction",
    direction: "egress", score: 85, action: "QUARANTINE",
    pattern: /(?:(?:https?:\/\/|ftp:\/\/)\S{20,}|base64\s*encode|curl\s+.*-d|wget\s+.*--post|send\s+(?:to|via)\s+(?:email|webhook|api))/i,
    tags: ["exfiltration", "security"], packs: ["general", "hipaa", "soc2", "finance"],
  },
  {
    id: "dpi-005", name: "Destructive Commands",
    description: "Blocks DROP, DELETE, TRUNCATE, rm -rf, and similar destructive operations",
    direction: "ingress", score: 80, action: "DENY",
    pattern: /(?:DROP\s+(?:TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE|DELETE\s+FROM\s+\S+\s*(?:;|$)|rm\s+-rf\s+\/|format\s+[cC]:|shutdown\s+[-\/])/i,
    tags: ["destructive", "security"], packs: ["general", "hipaa", "soc2", "finance"],
  },
  {
    id: "dpi-006", name: "Fabricated Citations",
    description: "Detects hallucinated references, fake DOIs, and non-existent URLs in outputs",
    direction: "egress", score: 60, action: "LOG",
    pattern: /(?:(?:doi\.org|arxiv\.org)\/(?:10\.\d{4,}\/\S+|abs\/\d{4}\.\d{4,}).*(?:does\s+not\s+exist|not\s+found)|(?:according\s+to|as\s+stated\s+in|per)\s+(?:the\s+)?(?:official|published)\s+(?:report|study|paper)\s+(?:by|from)\s+\S+\s+\(\d{4}\))/i,
    tags: ["fabrication", "integrity"], packs: ["general", "hipaa", "soc2", "finance"],
  },
];

const HIPAA_RULES: DpiRule[] = [
  {
    id: "dpi-h01", name: "PHI Detection",
    description: "Protected Health Information — patient names, diagnoses, treatment plans",
    direction: "both", score: 90, action: "DENY",
    pattern: /(?:patient\s+(?:name|id|record|diagnosis|treatment)|medical\s+record\s+(?:number|#)|(?:diagnosis|ICD)[:\s]+[A-Z]\d{2,}|HIPAA\s+(?:violation|breach))/i,
    tags: ["phi", "hipaa"], packs: ["hipaa"],
  },
  {
    id: "dpi-h02", name: "Provider ID Exposure",
    description: "NPI numbers and provider identifiers",
    direction: "both", score: 80, action: "QUARANTINE",
    pattern: /(?:NPI[:\s#]+\d{10}|DEA[:\s#]+[A-Z]{2}\d{7}|provider\s+(?:id|number|identifier)[:\s]+\S{5,})/i,
    tags: ["provider", "hipaa"], packs: ["hipaa"],
  },
  {
    id: "dpi-h03", name: "Consent Violation",
    description: "Sharing data without documented patient consent",
    direction: "egress", score: 85, action: "HUMAN_REVIEW",
    pattern: /(?:without\s+(?:patient\s+)?consent|share\s+(?:patient|medical|health)\s+(?:data|records|information)\s+with|disclose\s+(?:to|with)\s+(?:third|external))/i,
    tags: ["consent", "hipaa"], packs: ["hipaa"],
  },
  {
    id: "dpi-h04", name: "Minor Patient Data",
    description: "Extra protection for pediatric patient information",
    direction: "both", score: 95, action: "DENY",
    pattern: /(?:(?:minor|child|pediatric|juvenile)\s+patient|(?:age|DOB)[:\s]+(?:\d{1,2}\s+(?:months?|years?)|(?:0[1-9]|1[0-2])\/\d{2}\/(?:20[1-2]\d)))/i,
    tags: ["minor", "hipaa"], packs: ["hipaa"],
  },
];

const SOC2_RULES: DpiRule[] = [
  {
    id: "dpi-s01", name: "Access Escalation",
    description: "Unauthorized privilege escalation attempts",
    direction: "ingress", score: 90, action: "DENY",
    pattern: /(?:grant\s+(?:admin|root|superuser)|escalate\s+(?:privileges?|permissions?)|sudo\s+|chmod\s+(?:777|u\+s)|setuid|become\s+(?:admin|root))/i,
    tags: ["access", "soc2"], packs: ["soc2"],
  },
  {
    id: "dpi-s02", name: "Audit Tampering",
    description: "Attempts to modify, delete, or disable audit logs",
    direction: "ingress", score: 95, action: "DENY",
    pattern: /(?:(?:delete|remove|clear|truncate|disable)\s+(?:audit|log|trail)|modify\s+(?:audit|log)\s+(?:entries?|records?)|bypass\s+(?:audit|logging))/i,
    tags: ["tampering", "soc2"], packs: ["soc2"],
  },
  {
    id: "dpi-s03", name: "Encryption Bypass",
    description: "Attempts to disable or bypass encryption",
    direction: "both", score: 85, action: "QUARANTINE",
    pattern: /(?:disable\s+(?:ssl|tls|encryption|https)|plaintext\s+(?:password|credential|token)|(?:ssl|tls)_verify\s*=\s*(?:false|0)|VERIFY_NONE)/i,
    tags: ["encryption", "soc2"], packs: ["soc2"],
  },
  {
    id: "dpi-s04", name: "Change Management",
    description: "Detects uncontrolled production changes",
    direction: "ingress", score: 70, action: "LOG",
    pattern: /(?:deploy\s+(?:to|in)\s+prod(?:uction)?|push\s+(?:to\s+)?(?:main|master|prod)|hotfix\s+(?:without|no)\s+(?:review|approval)|skip\s+(?:ci|tests?|review))/i,
    tags: ["change-mgmt", "soc2"], packs: ["soc2"],
  },
];

const FINANCE_RULES: DpiRule[] = [
  {
    id: "dpi-f01", name: "High-Value Transaction",
    description: "Transactions above reporting threshold",
    direction: "both", score: 70, action: "LOG",
    pattern: /(?:(?:transfer|payment|wire|send)\s+(?:\$|€|£|¥)?\s*(?:\d{1,3}(?:,\d{3})*|\d+)\s*(?:million|M|billion|B|k{3,})|amount[:\s]+(?:\d{6,}|[1-9]\d{0,2}(?:,\d{3}){2,}))/i,
    tags: ["high-value", "finance"], packs: ["finance"],
  },
  {
    id: "dpi-f02", name: "Insider Trading Signals",
    description: "Discussion of material non-public information",
    direction: "both", score: 90, action: "QUARANTINE",
    pattern: /(?:(?:before|prior\s+to)\s+(?:the\s+)?(?:announcement|earnings|merger|acquisition)|material\s+(?:non-?public|insider)\s+(?:information|data)|(?:buy|sell)\s+(?:before|ahead\s+of)\s+(?:public|announcement))/i,
    tags: ["insider", "finance"], packs: ["finance"],
  },
  {
    id: "dpi-f03", name: "AML Patterns",
    description: "Anti-money laundering pattern detection",
    direction: "both", score: 85, action: "HUMAN_REVIEW",
    pattern: /(?:structur(?:e|ing)\s+(?:transactions?|payments?)|(?:split|break)\s+(?:into\s+)?(?:smaller|multiple)\s+(?:amounts?|transactions?)|(?:shell|offshore)\s+(?:company|account|entity)|smurfing|layering)/i,
    tags: ["aml", "finance"], packs: ["finance"],
  },
  {
    id: "dpi-f04", name: "Sanctions Screening",
    description: "References to sanctioned entities or jurisdictions",
    direction: "both", score: 80, action: "HUMAN_REVIEW",
    pattern: /(?:(?:OFAC|SDN|sanctions?)\s+(?:list|screening|check)|(?:sanctioned|embargoed)\s+(?:country|entity|individual|jurisdiction)|evad(?:e|ing)\s+sanctions?)/i,
    tags: ["sanctions", "finance"], packs: ["finance"],
  },
];

const ALL_RULES = [...BASE_RULES, ...HIPAA_RULES, ...SOC2_RULES, ...FINANCE_RULES];

// ─── Intent Detection ───────────────────────────────────────

const INTENT_PATTERNS: [string, RegExp][] = [
  ["summarization", /(?:summarize|summary|overview|brief|tldr)/i],
  ["analysis", /(?:analyze|assess|evaluate|compare|examine|investigate)/i],
  ["generation", /(?:generate|create|write|compose|draft|produce)/i],
  ["retrieval", /(?:find|search|look\s+up|get|fetch|retrieve|query)/i],
  ["deletion", /(?:delete|remove|drop|clear|purge|wipe|destroy)/i],
  ["modification", /(?:update|modify|change|edit|alter|patch|fix)/i],
  ["transmission", /(?:send|transmit|forward|share|export|transfer|upload)/i],
];

function detectIntent(content: string): string {
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(content)) return intent;
  }
  return "unknown";
}

// ─── Entity Extraction ──────────────────────────────────────

function extractEntities(content: string): string[] {
  const entities: string[] = [];
  const emailRe = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi;
  const ipRe = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const urlRe = /https?:\/\/[^\s"'<>]+/gi;

  for (const m of content.matchAll(emailRe)) entities.push(`email:${m[0]}`);
  for (const m of content.matchAll(ipRe)) entities.push(`ip:${m[0]}`);
  for (const m of content.matchAll(urlRe)) entities.push(`url:${m[0].slice(0, 100)}`);

  return entities;
}

// ─── Core Inspection ────────────────────────────────────────

export async function inspect(input: InspectionInput): Promise<InspectionResult> {
  const pack = input.compliancePack ?? "general";
  const applicableRules = ALL_RULES.filter(
    (r) =>
      r.packs.includes(pack) &&
      (r.direction === "both" || r.direction === input.direction),
  );

  const matchedRules: string[] = [];
  let maxScore = 0;
  let resultAction: InspectionResult["action"] = "ALLOW";
  let piiDetected = false;
  let credentialsDetected = false;
  let exfiltrationRisk = false;

  // P4-style first-match-wins (highest severity)
  for (const rule of applicableRules) {
    if (rule.pattern.test(input.content)) {
      matchedRules.push(rule.name);
      if (rule.score > maxScore) {
        maxScore = rule.score;
        resultAction = rule.action;
      }
      if (rule.tags.includes("pii") || rule.tags.includes("phi")) piiDetected = true;
      if (rule.tags.includes("credentials") || rule.tags.includes("leak")) credentialsDetected = true;
      if (rule.tags.includes("exfiltration")) exfiltrationRisk = true;
    }
  }

  const detectedIntent = detectIntent(input.content);
  const intentMatch = !input.declaredIntent || input.declaredIntent === detectedIntent;
  if (!intentMatch && resultAction === "ALLOW") {
    resultAction = "LOG";
    maxScore = Math.max(maxScore, 30);
    matchedRules.push("Intent Mismatch");
  }

  const extractedEntities = extractEntities(input.content);

  // Redact sensitive content in preview
  const redactedPreview = input.content
    .replace(/(?:sk-|pk-|ghp_|gho_|glpat-|xoxb-|xoxp-|AKIA)\w{10,}/gi, "[REDACTED_KEY]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]")
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED_CC]")
    .slice(0, 500);

  const id = crypto.randomUUID();

  // Persist to DB
  try {
    await db.insert(schema.dpiInspections).values({
      id,
      actor: input.actor ?? "anonymous",
      direction: input.direction,
      action: resultAction as typeof schema.policyAction.enumValues[number],
      riskScore: maxScore,
      matchedRules,
      redactedPreview,
      enterpriseId: input.enterpriseId,
      policyPackName: pack as typeof schema.compliancePack.enumValues[number],
      lobsterTrapMeta: {
        declaredIntent: input.declaredIntent,
        detectedIntent,
        intentMatch,
        extractedEntities,
        piiDetected,
        credentialsDetected,
        exfiltrationRisk,
      },
    });
  } catch {
    // DB may not be available
  }

  // Emit event
  const eventType = resultAction === "DENY" || resultAction === "QUARANTINE"
    ? EventTypes.DPI_THREAT_BLOCKED
    : resultAction === "HUMAN_REVIEW"
      ? EventTypes.DPI_HUMAN_REVIEW_REQUIRED
      : EventTypes.DPI_INSPECTION_COMPLETED;

  emit({
    eventType,
    sourceModule: "dpi",
    payload: { id, action: resultAction, riskScore: maxScore, matchedRules, enterpriseId: input.enterpriseId },
  }).catch(() => {});

  return {
    id,
    action: resultAction,
    riskScore: maxScore,
    matchedRules,
    redactedPreview,
    lobsterTrapMeta: {
      declaredIntent: input.declaredIntent,
      detectedIntent,
      intentMatch,
      extractedEntities,
      piiDetected,
      credentialsDetected,
      exfiltrationRisk,
    },
  };
}

// ─── Policy Pack Export (YAML-compatible) ───────────────────

export function getPolicyPack(pack: string) {
  const rules = ALL_RULES.filter((r) => r.packs.includes(pack));
  return {
    id: `pack_${pack}`,
    name: `${pack.charAt(0).toUpperCase() + pack.slice(1)} Compliance Pack`,
    description: `Lobster Trap DPI rules for ${pack} compliance`,
    version: "4.1.0",
    compliance: pack,
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      direction: r.direction,
      pattern: r.pattern.source,
      patternType: "regex" as const,
      score: r.score,
      action: r.action,
      tags: r.tags,
    })),
  };
}

export function getAllPolicyPacks() {
  return ["general", "hipaa", "soc2", "finance"].map(getPolicyPack);
}
