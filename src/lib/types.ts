export type LedgerClassification = "public" | "pseudonymized" | "classified";

export type ReviewStatus = "accepted" | "pending_review" | "quarantined" | "rejected";

export type PolicyAction = "ALLOW" | "DENY" | "LOG" | "HUMAN_REVIEW" | "QUARANTINE" | "RATE_LIMIT";

export type InspectionDirection = "ingress" | "egress";

export type GovLedgerTransaction = {
  id: string;
  jurisdiction: string;
  institution: string;
  counterparty: string;
  amount: number;
  currency: string;
  category: string;
  purpose: string;
  classification: LedgerClassification;
  status: ReviewStatus;
  riskScore: number;
  flags: string[];
  createdAt: string;
};

export type ImpactLedgerEntry = {
  id: string;
  actorName: string;
  sector: string;
  jurisdiction: string;
  reportingPeriod: string;
  emissionsTonsCo2e: number;
  waterM3: number;
  wasteKg: number;
  laborIncidents: number;
  animalWelfareScore: number;
  biodiversityImpact: number;
  supplyChainRisk: number;
  verificationStatus: ReviewStatus;
  riskScore: number;
  flags: string[];
  createdAt: string;
};

export type DpiInspection = {
  id: string;
  actor: string;
  direction: InspectionDirection;
  action: PolicyAction;
  riskScore: number;
  matchedRules: string[];
  redactedPreview: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  type: "govledger.transaction" | "impact.entry" | "security.inspection" | "system.bootstrap";
  summary: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  referenceId?: string;
};

export type SystemSnapshot = {
  generatedAt: string;
  metrics: {
    publicSpend: number;
    transactions: number;
    impactEntries: number;
    pendingReviews: number;
    quarantinedItems: number;
    averageImpactRisk: number;
    inspections: number;
  };
  transactions: GovLedgerTransaction[];
  impactEntries: ImpactLedgerEntry[];
  inspections: DpiInspection[];
  auditEvents: AuditEvent[];
};