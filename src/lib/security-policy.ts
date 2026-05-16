import { createId, nowIso } from "@/lib/ids";
import type { DpiInspection, InspectionDirection, PolicyAction } from "@/lib/types";

type PolicyRule = {
  id: string;
  label: string;
  pattern: RegExp;
  score: number;
  action: PolicyAction;
};

const policyRules: PolicyRule[] = [
  {
    id: "prompt_injection",
    label: "Prompt injection or role override",
    pattern: /ignore (all )?(previous|prior) instructions|system prompt|developer message|jailbreak|act as|you are now/i,
    score: 45,
    action: "HUMAN_REVIEW",
  },
  {
    id: "credential_leakage",
    label: "Credential or secret exposure",
    pattern: /(api[_-]?key|secret|token|password|bearer\s+[a-z0-9._-]{12,})/i,
    score: 75,
    action: "QUARANTINE",
  },
  {
    id: "pii_financial",
    label: "Sensitive personal or financial identifier",
    pattern: /(ssn|social security|credit card|iban|passport|national id|cnp)/i,
    score: 50,
    action: "HUMAN_REVIEW",
  },
  {
    id: "exfiltration_attempt",
    label: "Data exfiltration request",
    pattern: /export all|dump database|send .* to .*external|upload .* credentials|print env/i,
    score: 70,
    action: "QUARANTINE",
  },
  {
    id: "unauthorized_command",
    label: "Unauthorized destructive command",
    pattern: /rm -rf|format c:|drop table|delete from .* where 1=1|git reset --hard/i,
    score: 85,
    action: "DENY",
  },
  {
    id: "fabricated_citation",
    label: "Likely fabricated citation instruction",
    pattern: /invent citations|make up sources|fake reference|fabricate evidence/i,
    score: 55,
    action: "HUMAN_REVIEW",
  },
];

const actionRank: Record<PolicyAction, number> = {
  ALLOW: 0,
  LOG: 1,
  RATE_LIMIT: 2,
  HUMAN_REVIEW: 3,
  QUARANTINE: 4,
  DENY: 5,
};

function mostRestrictive(current: PolicyAction, next: PolicyAction): PolicyAction {
  return actionRank[next] > actionRank[current] ? next : current;
}

export function redactPreview(content: string) {
  return content
    .replace(/bearer\s+[a-z0-9._-]+/gi, "bearer [REDACTED]")
    .replace(/(api[_-]?key|secret|token|password)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
    .replace(/\b\d{13,19}\b/g, "[REDACTED_NUMBER]")
    .slice(0, 220);
}

export function inspectContent(input: {
  actor: string;
  direction: InspectionDirection;
  content: string;
}): DpiInspection {
  const matched = policyRules.filter((rule) => rule.pattern.test(input.content));
  const riskScore = Math.min(100, matched.reduce((total, rule) => total + rule.score, 0));
  const action = matched.reduce<PolicyAction>(
    (current, rule) => mostRestrictive(current, rule.action),
    riskScore > 0 ? "LOG" : "ALLOW",
  );

  return {
    id: createId("dpi"),
    actor: input.actor,
    direction: input.direction,
    action,
    riskScore,
    matchedRules: matched.map((rule) => rule.label),
    redactedPreview: redactPreview(input.content),
    createdAt: nowIso(),
  };
}

export function isBlockingAction(action: PolicyAction) {
  return action === "DENY" || action === "QUARANTINE";
}