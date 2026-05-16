export type LedgerClassification = "public" | "pseudonymized" | "classified";

export type ReviewStatus = "accepted" | "pending_review" | "quarantined" | "rejected";

export type PolicyAction = "ALLOW" | "DENY" | "LOG" | "HUMAN_REVIEW" | "QUARANTINE" | "RATE_LIMIT";

export type InspectionDirection = "ingress" | "egress";

export type JurisdictionStatus = "candidate" | "pilot" | "active" | "paused";

export type PlatformModuleStatus = "live" | "building" | "planned";

export type PlatformModule = {
  id: string;
  name: string;
  summary: string;
  status: PlatformModuleStatus;
  owner: string;
};

export type PlatformMilestone = {
  id: string;
  phase: string;
  horizon: string;
  goal: string;
  status: PlatformModuleStatus;
};

export type PlatformRoadmap = {
  release: string;
  sourceRepository: string;
  latestRelease: string;
  constitutionUrl: string;
  modules: PlatformModule[];
  milestones: PlatformMilestone[];
};

export type Jurisdiction = {
  id: string;
  name: string;
  region: string;
  governanceModel: string;
  population: number;
  status: JurisdictionStatus;
  modules: string[];
  createdAt: string;
};

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
  type:
    | "govledger.transaction"
    | "impact.entry"
    | "security.inspection"
    | "jurisdiction.onboarding"
    | "system.bootstrap"
    | "platform.release";
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
    jurisdictions: number;
    activeJurisdictions: number;
  };
  platform: PlatformRoadmap;
  jurisdictions: Jurisdiction[];
  transactions: GovLedgerTransaction[];
  impactEntries: ImpactLedgerEntry[];
  inspections: DpiInspection[];
  auditEvents: AuditEvent[];
};