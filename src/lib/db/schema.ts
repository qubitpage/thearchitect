/**
 * The Architect — Core Database Schema (Drizzle ORM + PostgreSQL)
 *
 * This is the single source of truth for all data structures.
 * Every module (GovLedger, Impact Ledger, Enterprise, DPI, Audit) shares
 * this schema and connects through foreign keys and the event bus.
 *
 * Design principles:
 * - All tables have created_at/updated_at timestamps
 * - Audit chain is append-only (no UPDATE/DELETE)
 * - Enterprise data is tenant-isolated via enterprise_id FK
 * - JSONB columns for flexible metadata without schema migrations
 * - Indexes on all query-hot columns
 */

import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  bigint,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  serial,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────

export const ledgerClassification = pgEnum("ledger_classification", [
  "public",
  "pseudonymized",
  "classified",
]);

export const reviewStatus = pgEnum("review_status", [
  "accepted",
  "pending_review",
  "quarantined",
  "rejected",
]);

export const policyAction = pgEnum("policy_action", [
  "ALLOW",
  "DENY",
  "LOG",
  "HUMAN_REVIEW",
  "QUARANTINE",
  "RATE_LIMIT",
]);

export const inspectionDirection = pgEnum("inspection_direction", [
  "ingress",
  "egress",
]);

export const jurisdictionStatus = pgEnum("jurisdiction_status", [
  "candidate",
  "pilot",
  "active",
  "paused",
  "withdrawn",
]);

export const enterpriseTier = pgEnum("enterprise_tier", [
  "pilot",
  "starter",
  "professional",
  "enterprise",
]);

export const enterpriseStatus = pgEnum("enterprise_status_enum", [
  "active",
  "trial",
  "suspended",
  "deactivated",
]);

export const compliancePack = pgEnum("compliance_pack", [
  "general",
  "hipaa",
  "soc2",
  "finance",
  "custom",
]);

export const auditSeverity = pgEnum("audit_severity", [
  "info",
  "warning",
  "critical",
]);

export const agentTaskType = pgEnum("agent_task_type", [
  "analyze_spending",
  "compliance_check",
  "risk_assessment",
  "document_review",
  "anomaly_detection",
  "policy_recommendation",
]);

export const agentTaskStatus = pgEnum("agent_task_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const moduleStatus = pgEnum("module_status", [
  "live",
  "building",
  "planned",
]);

export const riskLevel = pgEnum("risk_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

// ─── Core: Jurisdictions ────────────────────────────────────

export const jurisdictions = pgTable(
  "jurisdictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    region: varchar("region", { length: 128 }).notNull(),
    governanceModel: varchar("governance_model", { length: 128 }).notNull(),
    population: bigint("population", { mode: "number" }).notNull().default(0),
    status: jurisdictionStatus("status").notNull().default("candidate"),
    modules: jsonb("modules").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_jurisdictions_status").on(t.status),
    index("idx_jurisdictions_region").on(t.region),
  ],
);

// ─── Core: GovLedger Transactions ───────────────────────────

export const govledgerTransactions = pgTable(
  "govledger_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jurisdictionId: uuid("jurisdiction_id").references(() => jurisdictions.id),
    jurisdiction: varchar("jurisdiction_name", { length: 255 }).notNull(),
    institution: varchar("institution", { length: 255 }).notNull(),
    counterparty: varchar("counterparty", { length: 255 }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("EUR"),
    category: varchar("category", { length: 64 }).notNull(),
    purpose: text("purpose").notNull(),
    classification: ledgerClassification("classification").notNull().default("public"),
    status: reviewStatus("status").notNull().default("pending_review"),
    riskScore: integer("risk_score").notNull().default(0),
    flags: jsonb("flags").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    submittedBy: uuid("submitted_by"),
    reviewedBy: uuid("reviewed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_govledger_jurisdiction").on(t.jurisdictionId),
    index("idx_govledger_status").on(t.status),
    index("idx_govledger_category").on(t.category),
    index("idx_govledger_created").on(t.createdAt),
    index("idx_govledger_risk").on(t.riskScore),
  ],
);

// ─── Core: Impact Ledger ────────────────────────────────────

export const impactLedgerEntries = pgTable(
  "impact_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorName: varchar("actor_name", { length: 255 }).notNull(),
    sector: varchar("sector", { length: 64 }).notNull(),
    jurisdictionId: uuid("jurisdiction_id").references(() => jurisdictions.id),
    jurisdiction: varchar("jurisdiction_name", { length: 255 }).notNull(),
    reportingPeriod: varchar("reporting_period", { length: 16 }).notNull(),
    emissionsTonsCo2e: real("emissions_tons_co2e").notNull().default(0),
    waterM3: real("water_m3").notNull().default(0),
    wasteKg: real("waste_kg").notNull().default(0),
    laborIncidents: integer("labor_incidents").notNull().default(0),
    animalWelfareScore: real("animal_welfare_score").notNull().default(100),
    biodiversityImpact: real("biodiversity_impact").notNull().default(0),
    supplyChainRisk: real("supply_chain_risk").notNull().default(0),
    communityDisplacement: integer("community_displacement").notNull().default(0),
    taxTransparencyScore: real("tax_transparency_score").notNull().default(100),
    verificationStatus: reviewStatus("verification_status").notNull().default("pending_review"),
    riskScore: integer("risk_score").notNull().default(0),
    flags: jsonb("flags").$type<string[]>().notNull().default([]),
    enterpriseId: uuid("enterprise_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_impact_sector").on(t.sector),
    index("idx_impact_jurisdiction").on(t.jurisdictionId),
    index("idx_impact_status").on(t.verificationStatus),
    index("idx_impact_enterprise").on(t.enterpriseId),
    index("idx_impact_period").on(t.reportingPeriod),
  ],
);

// ─── Core: DPI Inspections ──────────────────────────────────

export const dpiInspections = pgTable(
  "dpi_inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actor: varchar("actor", { length: 255 }).notNull(),
    direction: inspectionDirection("direction").notNull(),
    action: policyAction("action").notNull(),
    riskScore: integer("risk_score").notNull().default(0),
    matchedRules: jsonb("matched_rules").$type<string[]>().notNull().default([]),
    redactedPreview: text("redacted_preview").notNull().default(""),
    // Enterprise-scoped fields (null for platform-level)
    enterpriseId: uuid("enterprise_id"),
    policyPackName: compliancePack("policy_pack"),
    lobsterTrapMeta: jsonb("lobster_trap_meta").$type<{
      declaredIntent?: string;
      detectedIntent: string;
      intentMatch: boolean;
      extractedEntities: string[];
      piiDetected: boolean;
      credentialsDetected: boolean;
      exfiltrationRisk: boolean;
    }>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_dpi_action").on(t.action),
    index("idx_dpi_enterprise").on(t.enterpriseId),
    index("idx_dpi_created").on(t.createdAt),
    index("idx_dpi_direction").on(t.direction),
  ],
);

// ─── Core: Audit Chain (append-only) ────────────────────────

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seq: serial("seq").notNull(), // monotonic ordering
    type: varchar("type", { length: 64 }).notNull(),
    summary: text("summary").notNull(),
    severity: auditSeverity("severity").notNull().default("info"),
    referenceId: uuid("reference_id"),
    referenceTable: varchar("reference_table", { length: 64 }),
    enterpriseId: uuid("enterprise_id"),
    hash: varchar("hash", { length: 64 }).notNull(),
    previousHash: varchar("previous_hash", { length: 64 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_audit_type").on(t.type),
    index("idx_audit_severity").on(t.severity),
    index("idx_audit_enterprise").on(t.enterpriseId),
    index("idx_audit_created").on(t.createdAt),
    uniqueIndex("idx_audit_seq").on(t.seq),
  ],
);

// ─── Enterprise: Tenants ────────────────────────────────────

export const enterprises = pgTable(
  "enterprises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    tier: enterpriseTier("tier").notNull().default("pilot"),
    status: enterpriseStatus("status").notNull().default("trial"),
    compliancePack: compliancePack("compliance_pack").notNull().default("general"),
    apiKeyHash: varchar("api_key_hash", { length: 64 }).notNull(),
    contactEmail: varchar("contact_email", { length: 255 }).notNull(),
    industry: varchar("industry", { length: 128 }).notNull(),
    agentQuota: integer("agent_quota").notNull().default(50),
    agentsUsed: integer("agents_used").notNull().default(0),
    // Billing & usage
    monthlyBudget: bigint("monthly_budget", { mode: "number" }).default(0),
    currentSpend: bigint("current_spend", { mode: "number" }).default(0),
    // Settings
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_enterprise_slug").on(t.slug),
    uniqueIndex("idx_enterprise_domain").on(t.domain),
    index("idx_enterprise_status").on(t.status),
    index("idx_enterprise_tier").on(t.tier),
  ],
);

// ─── Enterprise: Agent Tasks ────────────────────────────────

export const agentTasks = pgTable(
  "agent_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    type: agentTaskType("type").notNull(),
    input: text("input").notNull(),
    context: jsonb("context").$type<Record<string, unknown>>().default({}),
    status: agentTaskStatus("status").notNull().default("pending"),
    result: jsonb("result").$type<{
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
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_agent_enterprise").on(t.enterpriseId),
    index("idx_agent_status").on(t.status),
    index("idx_agent_type").on(t.type),
    index("idx_agent_created").on(t.createdAt),
  ],
);

// ─── Enterprise: CorpLedger (Corporate Financial Transparency) ──

export const corpledgerTransactions = pgTable(
  "corpledger_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    department: varchar("department", { length: 128 }).notNull(),
    counterparty: varchar("counterparty", { length: 255 }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("EUR"),
    category: varchar("category", { length: 64 }).notNull(),
    purpose: text("purpose").notNull(),
    approvedBy: varchar("approved_by", { length: 255 }),
    status: reviewStatus("status").notNull().default("pending_review"),
    riskScore: integer("risk_score").notNull().default(0),
    flags: jsonb("flags").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_corpledger_enterprise").on(t.enterpriseId),
    index("idx_corpledger_status").on(t.status),
    index("idx_corpledger_category").on(t.category),
    index("idx_corpledger_created").on(t.createdAt),
  ],
);

// ─── Enterprise: Merit Protocol ─────────────────────────────

export const meritEvaluations = pgTable(
  "merit_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    candidateId: varchar("candidate_id", { length: 128 }).notNull(),
    positionTitle: varchar("position_title", { length: 255 }).notNull(),
    department: varchar("department", { length: 128 }).notNull(),
    // Anonymized scores (the 40/40/20 model)
    peerScore: real("peer_score").notNull().default(0), // 0-100
    metricsScore: real("metrics_score").notNull().default(0), // 0-100
    feedbackScore: real("feedback_score").notNull().default(0), // 0-100 (360°)
    compositeScore: real("composite_score").notNull().default(0), // weighted
    // Bias detection
    biasFlags: jsonb("bias_flags").$type<string[]>().notNull().default([]),
    evaluationPeriod: varchar("evaluation_period", { length: 16 }).notNull(),
    status: reviewStatus("status").notNull().default("pending_review"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_merit_enterprise").on(t.enterpriseId),
    index("idx_merit_department").on(t.department),
    index("idx_merit_period").on(t.evaluationPeriod),
  ],
);

// ─── Enterprise: Employee Democracy (Liquid Voting) ─────────

export const votingProposals = pgTable(
  "voting_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 64 }).notNull(), // strategy, compensation, policy, merger
    proposedBy: varchar("proposed_by", { length: 255 }).notNull(),
    // Voting rules
    requiredQuorum: real("required_quorum").notNull().default(0.5),
    employeeWeight: real("employee_weight").notNull().default(0.2), // 20% employee, 80% shareholder
    // Results
    votesFor: integer("votes_for").notNull().default(0),
    votesAgainst: integer("votes_against").notNull().default(0),
    votesAbstain: integer("votes_abstain").notNull().default(0),
    totalEligible: integer("total_eligible").notNull().default(0),
    status: varchar("status", { length: 32 }).notNull().default("open"), // open, closed, approved, rejected
    closesAt: timestamp("closes_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_voting_enterprise").on(t.enterpriseId),
    index("idx_voting_status").on(t.status),
    index("idx_voting_category").on(t.category),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => votingProposals.id, { onDelete: "cascade" }),
    voterId: varchar("voter_id", { length: 128 }).notNull(),
    voterType: varchar("voter_type", { length: 32 }).notNull(), // employee, shareholder, delegate
    delegatedFrom: varchar("delegated_from", { length: 128 }),
    vote: varchar("vote", { length: 16 }).notNull(), // for, against, abstain
    weight: real("weight").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_votes_proposal").on(t.proposalId),
    uniqueIndex("idx_votes_unique").on(t.proposalId, t.voterId),
  ],
);

// ─── GovOS: Digital Identity & Services ─────────────────────

export const identityVerificationStatus = pgEnum("identity_verification_status", [
  "unverified",
  "pending",
  "verified",
  "suspended",
  "revoked",
]);

export const serviceRequestStatus = pgEnum("service_request_status", [
  "submitted",
  "processing",
  "approved",
  "rejected",
  "completed",
]);

export const digitalIdentities = pgTable(
  "digital_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jurisdictionId: uuid("jurisdiction_id").references(() => jurisdictions.id),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    identifierHash: varchar("identifier_hash", { length: 64 }).notNull(), // SHA-256 of real ID
    identityType: varchar("identity_type", { length: 32 }).notNull(), // citizen, business, organization
    verificationStatus: identityVerificationStatus("verification_status").notNull().default("unverified"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: varchar("verified_by", { length: 255 }),
    services: jsonb("services").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_identity_hash").on(t.identifierHash),
    index("idx_identity_jurisdiction").on(t.jurisdictionId),
    index("idx_identity_status").on(t.verificationStatus),
    index("idx_identity_type").on(t.identityType),
  ],
);

export const govServices = pgTable(
  "gov_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jurisdictionId: uuid("jurisdiction_id").references(() => jurisdictions.id),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(), // permits, licenses, benefits, taxes, healthcare, education
    description: text("description").notNull(),
    requiredDocuments: jsonb("required_documents").$type<string[]>().notNull().default([]),
    estimatedDays: integer("estimated_days").notNull().default(30),
    fee: bigint("fee", { mode: "number" }).notNull().default(0),
    feeCurrency: varchar("fee_currency", { length: 8 }).notNull().default("USD"),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gov_services_jurisdiction").on(t.jurisdictionId),
    index("idx_gov_services_category").on(t.category),
    index("idx_gov_services_active").on(t.isActive),
  ],
);

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => govServices.id),
    identityId: uuid("identity_id")
      .notNull()
      .references(() => digitalIdentities.id),
    status: serviceRequestStatus("status").notNull().default("submitted"),
    submittedDocuments: jsonb("submitted_documents").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    processedBy: varchar("processed_by", { length: 255 }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_service_req_service").on(t.serviceId),
    index("idx_service_req_identity").on(t.identityId),
    index("idx_service_req_status").on(t.status),
    index("idx_service_req_created").on(t.createdAt),
  ],
);

// ─── LaborNet: Fair Labor & Skills Registry ─────────────────

export const laborSkillLevel = pgEnum("labor_skill_level", [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
]);

export const contractStatus = pgEnum("contract_status", [
  "draft",
  "active",
  "completed",
  "disputed",
  "terminated",
]);

export const workerProfiles = pgTable(
  "worker_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identityId: uuid("identity_id").references(() => digitalIdentities.id),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    jurisdictionId: uuid("jurisdiction_id").references(() => jurisdictions.id),
    skills: jsonb("skills").$type<
      Array<{ name: string; level: string; verifiedAt?: string; verifiedBy?: string }>
    >().notNull().default([]),
    hourlyRate: real("hourly_rate"),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    availableHoursPerWeek: integer("available_hours_per_week").notNull().default(40),
    reputationScore: real("reputation_score").notNull().default(50), // 0-100
    totalContracts: integer("total_contracts").notNull().default(0),
    completedContracts: integer("completed_contracts").notNull().default(0),
    disputeRate: real("dispute_rate").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_worker_identity").on(t.identityId),
    index("idx_worker_jurisdiction").on(t.jurisdictionId),
    index("idx_worker_reputation").on(t.reputationScore),
    index("idx_worker_active").on(t.isActive),
  ],
);

export const laborContracts = pgTable(
  "labor_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => workerProfiles.id),
    employerId: uuid("employer_id"), // enterprise or jurisdiction
    employerName: varchar("employer_name", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    hourlyRate: real("hourly_rate").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    hoursPerWeek: integer("hours_per_week").notNull().default(40),
    totalHoursLogged: real("total_hours_logged").notNull().default(0),
    totalPaid: bigint("total_paid", { mode: "number" }).notNull().default(0),
    status: contractStatus("status").notNull().default("draft"),
    fairnessScore: real("fairness_score").notNull().default(50), // auto-calculated
    flags: jsonb("flags").$type<string[]>().notNull().default([]),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_labor_worker").on(t.workerId),
    index("idx_labor_employer").on(t.employerId),
    index("idx_labor_status").on(t.status),
    index("idx_labor_fairness").on(t.fairnessScore),
    index("idx_labor_created").on(t.createdAt),
  ],
);

export const laborDisputes = pgTable(
  "labor_disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => laborContracts.id),
    filedBy: varchar("filed_by", { length: 32 }).notNull(), // worker, employer
    reason: varchar("reason", { length: 64 }).notNull(), // underpayment, scope_creep, non_payment, quality, safety
    description: text("description").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("open"), // open, investigating, resolved, escalated
    resolution: text("resolution"),
    resolvedBy: varchar("resolved_by", { length: 255 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_dispute_contract").on(t.contractId),
    index("idx_dispute_status").on(t.status),
    index("idx_dispute_filed_by").on(t.filedBy),
  ],
);

// ─── Platform: Modules & Roadmap ────────────────────────────

export const platformModules = pgTable("platform_modules", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  summary: text("summary").notNull(),
  status: moduleStatus("status").notNull().default("planned"),
  owner: varchar("owner", { length: 128 }).notNull(),
  version: varchar("version", { length: 32 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformMilestones = pgTable("platform_milestones", {
  id: varchar("id", { length: 64 }).primaryKey(),
  phase: varchar("phase", { length: 64 }).notNull(),
  horizon: varchar("horizon", { length: 64 }).notNull(),
  goal: text("goal").notNull(),
  status: moduleStatus("status").notNull().default("planned"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Event Bus: Cross-Module Communication ──────────────────

export const eventBus = pgTable(
  "event_bus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seq: serial("seq").notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    sourceModule: varchar("source_module", { length: 64 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processed: boolean("processed").notNull().default(false),
    processedBy: jsonb("processed_by").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_event_type").on(t.eventType),
    index("idx_event_source").on(t.sourceModule),
    index("idx_event_processed").on(t.processed),
    index("idx_event_created").on(t.createdAt),
  ],
);
