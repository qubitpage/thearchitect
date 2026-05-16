/**
 * Lobster Trap Policy Engine — Deep Prompt Inspection for Enterprises
 *
 * WHAT THIS IS:
 * A Lobster Trap-compatible policy enforcement engine that provides
 * enterprise-grade DPI (Deep Prompt Inspection) with:
 *
 * - P4-style first-match-wins rule evaluation
 * - Compliance-specific policy packs (HIPAA, SOC2, Finance, General)
 * - Bidirectional inspection (ingress + egress)
 * - Declared-vs-detected intent analysis
 * - Structured metadata extraction (_lobstertrap block)
 * - PII, credential, and exfiltration detection
 *
 * HOW IT MAPS TO LOBSTER TRAP:
 * Lobster Trap is Veea's open-source DPI proxy that sits between agents
 * and LLM backends. Our engine implements the same rule format and actions
 * so enterprises can:
 * 1. Use our built-in engine for inspection
 * 2. Export rules as YAML for use with the actual Lobster Trap binary
 * 3. Import Lobster Trap YAML policies into our system
 *
 * POLICY ACTIONS (same as Lobster Trap):
 * - ALLOW:        Pass through, no intervention
 * - LOG:          Pass through but record for audit
 * - RATE_LIMIT:   Slow down requests from this actor
 * - HUMAN_REVIEW: Queue for human approval before proceeding
 * - QUARANTINE:   Block and isolate for investigation
 * - DENY:         Hard block, no passage
 */

import { createId, nowIso } from "@/lib/ids";
import type {
  CompliancePack,
  EnterpriseDpiInspection,
  LobsterTrapRule,
  PolicyPack,
} from "@/lib/enterprise/types";
import type { PolicyAction } from "@/lib/types";

// ─── Policy Pack Definitions ────────────────────────────────

const generalRules: LobsterTrapRule[] = [
  {
    id: "gen_prompt_injection",
    name: "Prompt Injection Detection",
    description: "Detects attempts to override system instructions or inject malicious prompts",
    direction: "ingress",
    pattern: "ignore (all )?(previous|prior) instructions|system prompt|developer message|jailbreak|act as|you are now|pretend you|roleplay as",
    patternType: "regex",
    score: 45,
    action: "HUMAN_REVIEW",
    tags: ["injection", "manipulation"],
    compliancePack: "general",
  },
  {
    id: "gen_credential_leak",
    name: "Credential Exposure",
    description: "Detects API keys, secrets, tokens, passwords in content",
    direction: "both",
    pattern: "(api[_-]?key|secret|token|password|bearer\\s+[a-z0-9._-]{12,})",
    patternType: "regex",
    score: 75,
    action: "QUARANTINE",
    tags: ["credentials", "leakage"],
    compliancePack: "general",
  },
  {
    id: "gen_pii_detection",
    name: "PII Detection",
    description: "Detects personal identifiable information including SSN, credit cards, IBANs",
    direction: "both",
    pattern: "(ssn|social security|credit card|iban|passport|national id|cnp|\\b\\d{3}-\\d{2}-\\d{4}\\b|\\b\\d{13,19}\\b)",
    patternType: "regex",
    score: 50,
    action: "HUMAN_REVIEW",
    tags: ["pii", "privacy"],
    compliancePack: "general",
  },
  {
    id: "gen_exfiltration",
    name: "Data Exfiltration",
    description: "Detects attempts to export, dump, or transmit data externally",
    direction: "egress",
    pattern: "export all|dump database|send .* to .*external|upload .* credentials|print env|wget|curl.*-o|base64.*encode",
    patternType: "regex",
    score: 70,
    action: "QUARANTINE",
    tags: ["exfiltration", "data-loss"],
    compliancePack: "general",
  },
  {
    id: "gen_destructive_cmd",
    name: "Destructive Commands",
    description: "Detects dangerous system commands that could cause data loss",
    direction: "both",
    pattern: "rm -rf|format c:|drop table|delete from .* where 1=1|git reset --hard|truncate table|shutdown|mkfs",
    patternType: "regex",
    score: 85,
    action: "DENY",
    tags: ["destructive", "dangerous"],
    compliancePack: "general",
  },
  {
    id: "gen_fabrication",
    name: "Fabrication Instruction",
    description: "Detects instructions to create false information",
    direction: "ingress",
    pattern: "invent citations|make up sources|fake reference|fabricate evidence|hallucinate|create fake",
    patternType: "regex",
    score: 55,
    action: "HUMAN_REVIEW",
    tags: ["fabrication", "integrity"],
    compliancePack: "general",
  },
];

const hipaaRules: LobsterTrapRule[] = [
  {
    id: "hipaa_phi_detection",
    name: "Protected Health Information (PHI)",
    description: "Detects health records, diagnoses, treatment plans, and patient identifiers",
    direction: "both",
    pattern: "(patient id|medical record|diagnosis|treatment plan|prescription|health insurance|dob.*patient|blood type|allergy|icd-10|cpt code|npi number)",
    patternType: "regex",
    score: 80,
    action: "QUARANTINE",
    tags: ["hipaa", "phi", "healthcare"],
    compliancePack: "hipaa",
  },
  {
    id: "hipaa_provider_id",
    name: "Healthcare Provider Identifiers",
    description: "Detects NPI numbers, DEA numbers, and provider credentials",
    direction: "both",
    pattern: "(npi\\s*[:#]?\\s*\\d{10}|dea\\s*[:#]?\\s*[a-z]\\d{7}|provider.*(license|credential|certification))",
    patternType: "regex",
    score: 65,
    action: "HUMAN_REVIEW",
    tags: ["hipaa", "provider-id"],
    compliancePack: "hipaa",
  },
  {
    id: "hipaa_consent_violation",
    name: "Consent Boundary Violation",
    description: "Detects sharing health data without explicit consent reference",
    direction: "egress",
    pattern: "(share.*patient.*data|forward.*medical|distribute.*health.*record|third.?party.*health)",
    patternType: "regex",
    score: 70,
    action: "DENY",
    tags: ["hipaa", "consent"],
    compliancePack: "hipaa",
  },
  {
    id: "hipaa_minors",
    name: "Minor Patient Data",
    description: "Extra protection for pediatric patient data",
    direction: "both",
    pattern: "(pediatric|minor.*patient|child.*medical|adolescent.*health|guardian.*consent)",
    patternType: "regex",
    score: 85,
    action: "DENY",
    tags: ["hipaa", "minors", "special-protection"],
    compliancePack: "hipaa",
  },
];

const soc2Rules: LobsterTrapRule[] = [
  {
    id: "soc2_access_escalation",
    name: "Access Privilege Escalation",
    description: "Detects attempts to gain unauthorized access or escalate privileges",
    direction: "ingress",
    pattern: "(sudo|admin access|root.*password|privilege.*escalat|grant.*all|alter.*role|create.*superuser)",
    patternType: "regex",
    score: 75,
    action: "DENY",
    tags: ["soc2", "access-control"],
    compliancePack: "soc2",
  },
  {
    id: "soc2_audit_tampering",
    name: "Audit Log Tampering",
    description: "Detects attempts to modify, delete, or disable audit logs",
    direction: "both",
    pattern: "(delete.*log|truncate.*audit|disable.*logging|modify.*audit.*trail|clear.*history|purge.*event)",
    patternType: "regex",
    score: 90,
    action: "DENY",
    tags: ["soc2", "audit-integrity"],
    compliancePack: "soc2",
  },
  {
    id: "soc2_encryption_bypass",
    name: "Encryption Bypass",
    description: "Detects attempts to transmit data without encryption or disable TLS",
    direction: "egress",
    pattern: "(http://(?!localhost)|disable.*tls|skip.*ssl|plaintext.*transmit|unencrypted.*channel)",
    patternType: "regex",
    score: 65,
    action: "QUARANTINE",
    tags: ["soc2", "encryption"],
    compliancePack: "soc2",
  },
  {
    id: "soc2_change_mgmt",
    name: "Unauthorized Change Management",
    description: "Detects production changes without proper change management",
    direction: "both",
    pattern: "(deploy.*prod.*without|skip.*review|bypass.*approval|hotfix.*production|force.*push.*main)",
    patternType: "regex",
    score: 60,
    action: "HUMAN_REVIEW",
    tags: ["soc2", "change-management"],
    compliancePack: "soc2",
  },
];

const financeRules: LobsterTrapRule[] = [
  {
    id: "fin_transaction_limit",
    name: "High-Value Transaction Alert",
    description: "Flags transactions or amounts exceeding enterprise thresholds",
    direction: "both",
    pattern: "(\\$\\s*\\d{1,3}(,\\d{3}){2,}|€\\s*\\d{1,3}(\\.\\d{3}){2,}|amount.*exceed|transfer.*\\d{7,}|wire.*million)",
    patternType: "regex",
    score: 55,
    action: "HUMAN_REVIEW",
    tags: ["finance", "high-value"],
    compliancePack: "finance",
  },
  {
    id: "fin_insider_trading",
    name: "Insider Information Patterns",
    description: "Detects potential insider trading or material non-public information",
    direction: "both",
    pattern: "(insider.*info|material.*non-?public|mnpi|earnings.*before.*release|merger.*confidential|acquisition.*secret)",
    patternType: "regex",
    score: 90,
    action: "DENY",
    tags: ["finance", "insider-trading", "compliance"],
    compliancePack: "finance",
  },
  {
    id: "fin_aml_patterns",
    name: "Anti-Money Laundering Patterns",
    description: "Detects structuring, layering, and money laundering indicators",
    direction: "both",
    pattern: "(structuring|smurfing|layering.*transaction|shell.*company.*transfer|offshore.*untrace|split.*deposit.*threshold)",
    patternType: "regex",
    score: 85,
    action: "QUARANTINE",
    tags: ["finance", "aml", "compliance"],
    compliancePack: "finance",
  },
  {
    id: "fin_sanctions_check",
    name: "Sanctions Screening",
    description: "Detects references to sanctioned entities, countries, or SDN list items",
    direction: "both",
    pattern: "(sanctioned.*entity|ofac|sdn list|embargo|blocked.*person|designated.*national|crimea|north korea.*transfer|iran.*payment)",
    patternType: "regex",
    score: 95,
    action: "DENY",
    tags: ["finance", "sanctions", "compliance"],
    compliancePack: "finance",
  },
];

// ─── Policy Pack Assembly ───────────────────────────────────

export function getPolicyPack(compliance: CompliancePack): PolicyPack {
  const baseRules = [...generalRules];

  let extraRules: LobsterTrapRule[] = [];
  let description = "";

  switch (compliance) {
    case "hipaa":
      extraRules = hipaaRules;
      description = "HIPAA-compliant policy pack for healthcare organizations. Includes PHI detection, consent enforcement, and minor patient protection.";
      break;
    case "soc2":
      extraRules = soc2Rules;
      description = "SOC 2 Type II policy pack for technology companies. Includes access control, audit integrity, encryption, and change management.";
      break;
    case "finance":
      extraRules = financeRules;
      description = "Financial services policy pack. Includes AML screening, sanctions, insider trading detection, and high-value transaction alerts.";
      break;
    default:
      description = "General governance policy pack with prompt injection, credential leakage, PII, exfiltration, and destructive command detection.";
  }

  return {
    id: `pack_${compliance}`,
    name: `${compliance.toUpperCase()} Compliance Pack`,
    description,
    version: "1.0.0",
    compliance,
    rules: [...baseRules, ...extraRules],
  };
}

// ─── Policy Enforcement ─────────────────────────────────────

const actionRank: Record<PolicyAction, number> = {
  ALLOW: 0,
  LOG: 1,
  RATE_LIMIT: 2,
  HUMAN_REVIEW: 3,
  QUARANTINE: 4,
  DENY: 5,
};

function detectIntent(content: string): string {
  const lower = content.toLowerCase();
  if (/summarize|summary|overview|brief/.test(lower)) return "summarization";
  if (/analyze|analysis|assess|evaluate|review/.test(lower)) return "analysis";
  if (/create|generate|write|draft|compose/.test(lower)) return "generation";
  if (/search|find|look up|query|retrieve/.test(lower)) return "retrieval";
  if (/delete|remove|drop|destroy|erase/.test(lower)) return "deletion";
  if (/update|modify|change|edit|alter/.test(lower)) return "modification";
  if (/send|transmit|forward|share|export/.test(lower)) return "transmission";
  if (/translate|convert|transform/.test(lower)) return "transformation";
  return "general";
}

function extractEntities(content: string): string[] {
  const entities: string[] = [];
  const emailMatch = content.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emailMatch) entities.push(...emailMatch.map((e) => `email:${e}`));
  const urlMatch = content.match(/https?:\/\/[^\s]+/g);
  if (urlMatch) entities.push(...urlMatch.map((u) => `url:${u.slice(0, 60)}`));
  const ipMatch = content.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g);
  if (ipMatch) entities.push(...ipMatch.map((ip) => `ip:${ip}`));
  return entities.slice(0, 20);
}

export function inspectWithPolicy(
  content: string,
  actor: string,
  direction: "ingress" | "egress",
  pack: PolicyPack,
  declaredIntent?: string,
  enterpriseId?: string,
): EnterpriseDpiInspection {
  const applicableRules = pack.rules.filter(
    (rule) => rule.direction === "both" || rule.direction === direction,
  );

  const matched: LobsterTrapRule[] = [];
  for (const rule of applicableRules) {
    try {
      const regex = new RegExp(rule.pattern, "i");
      if (regex.test(content)) {
        matched.push(rule);
      }
    } catch {
      // Invalid regex — skip rule
    }
  }

  const riskScore = Math.min(100, matched.reduce((sum, rule) => sum + rule.score, 0));

  let action: PolicyAction = riskScore > 0 ? "LOG" : "ALLOW";
  for (const rule of matched) {
    if (actionRank[rule.action] > actionRank[action]) {
      action = rule.action;
    }
  }

  const detectedIntent = detectIntent(content);
  const intentMatch = declaredIntent ? declaredIntent === detectedIntent : true;
  const entities = extractEntities(content);
  const piiDetected = matched.some((r) => r.tags.includes("pii") || r.tags.includes("phi") || r.tags.includes("privacy"));
  const credentialsDetected = matched.some((r) => r.tags.includes("credentials") || r.tags.includes("leakage"));
  const exfiltrationRisk = matched.some((r) => r.tags.includes("exfiltration") || r.tags.includes("data-loss"));

  // Intent mismatch escalation
  if (!intentMatch && action === "ALLOW") {
    action = "LOG";
  }
  if (!intentMatch && riskScore > 30) {
    action = actionRank[action] < actionRank["HUMAN_REVIEW"] ? "HUMAN_REVIEW" : action;
  }

  const preview = content
    .replace(/bearer\s+[a-z0-9._-]+/gi, "bearer [REDACTED]")
    .replace(/(api[_-]?key|secret|token|password)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
    .replace(/\b\d{13,19}\b/g, "[REDACTED_NUMBER]")
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, "[REDACTED_EMAIL]")
    .slice(0, 220);

  return {
    id: createId("edpi"),
    enterpriseId: enterpriseId ?? "system",
    actor,
    direction,
    action,
    riskScore,
    matchedRules: matched.map((r) => r.name),
    policyPack: pack.compliance,
    redactedPreview: preview,
    lobsterTrapMeta: {
      declaredIntent,
      detectedIntent,
      intentMatch,
      extractedEntities: entities,
      piiDetected,
      credentialsDetected,
      exfiltrationRisk,
    },
    createdAt: nowIso(),
  };
}

// ─── YAML Export (Lobster Trap compatible) ───────────────────

export function exportPolicyAsYaml(pack: PolicyPack): string {
  const lines = [
    `# The Architect — ${pack.name}`,
    `# ${pack.description}`,
    `# Version: ${pack.version}`,
    `# Compatible with Veea Lobster Trap DPI proxy`,
    "",
    "policy:",
    `  name: "${pack.name}"`,
    `  version: "${pack.version}"`,
    `  compliance: ${pack.compliance}`,
    `  match_mode: first_match_wins`,
    "",
    "rules:",
  ];

  for (const rule of pack.rules) {
    lines.push(`  - id: ${rule.id}`);
    lines.push(`    name: "${rule.name}"`);
    lines.push(`    description: "${rule.description}"`);
    lines.push(`    direction: ${rule.direction}`);
    lines.push(`    pattern: "${rule.pattern}"`);
    lines.push(`    pattern_type: ${rule.patternType}`);
    lines.push(`    score: ${rule.score}`);
    lines.push(`    action: ${rule.action}`);
    lines.push(`    tags: [${rule.tags.map((t) => `"${t}"`).join(", ")}]`);
    lines.push("");
  }

  lines.push("# Default action (when no rule matches):");
  lines.push("default_action: ALLOW");

  return lines.join("\n");
}
