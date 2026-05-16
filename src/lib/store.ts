import { createId, nowIso } from "@/lib/ids";
import { scoreGovLedgerTransaction, scoreImpactEntry } from "@/lib/risk";
import { inspectContent } from "@/lib/security-policy";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import type {
  AuditEvent,
  DpiInspection,
  GovLedgerTransaction,
  ImpactLedgerEntry,
  Jurisdiction,
  ReviewStatus,
} from "@/lib/types";
import type {
  DpiInspectionInput,
  GovLedgerTransactionInput,
  ImpactLedgerEntryInput,
  JurisdictionInput,
} from "@/lib/validation";

type ArchitectStore = {
  transactions: GovLedgerTransaction[];
  impactEntries: ImpactLedgerEntry[];
  inspections: DpiInspection[];
  jurisdictions: Jurisdiction[];
  auditEvents: AuditEvent[];
};

type GlobalStore = typeof globalThis & {
  __theArchitectStore?: ArchitectStore;
};

const storePath = join(cwd(), ".data", "architect-store.json");

function createSeedStore(): ArchitectStore {
  const bootedAt = nowIso();

  return {
    transactions: [
      {
        id: "gov_seed_procurement_001",
        jurisdiction: "Founding City Pilot",
        institution: "Public Works Authority",
        counterparty: "Open Roads Cooperative",
        amount: 2_000_000,
        currency: "EUR",
        category: "infrastructure",
        purpose: "Road repair procurement with seven public bids and milestone escrow.",
        classification: "public",
        status: "pending_review",
        riskScore: 25,
        flags: ["high value contract"],
        createdAt: bootedAt,
      },
      {
        id: "gov_seed_health_001",
        jurisdiction: "Founding City Pilot",
        institution: "Health Procurement Office",
        counterparty: "Regional Vaccine Alliance",
        amount: 740_000,
        currency: "EUR",
        category: "healthcare",
        purpose: "Vaccine purchase with public delivery schedule and batch verification.",
        classification: "public",
        status: "accepted",
        riskScore: 0,
        flags: [],
        createdAt: bootedAt,
      },
    ],
    impactEntries: [
      {
        id: "impact_seed_energy_001",
        actorName: "North Grid Energy",
        sector: "energy",
        jurisdiction: "Founding City Pilot",
        reportingPeriod: "2026-Q2",
        emissionsTonsCo2e: 128_000,
        waterM3: 740_000,
        wasteKg: 34_000,
        laborIncidents: 1,
        animalWelfareScore: 100,
        biodiversityImpact: -12,
        supplyChainRisk: 62,
        verificationStatus: "pending_review",
        riskScore: 30,
        flags: ["high emissions exposure", "reported labor incidents"],
        createdAt: bootedAt,
      },
      {
        id: "impact_seed_food_001",
        actorName: "Civic Vertical Farms",
        sector: "food",
        jurisdiction: "Founding City Pilot",
        reportingPeriod: "2026-Q2",
        emissionsTonsCo2e: 1_900,
        waterM3: 14_000,
        wasteKg: 870,
        laborIncidents: 0,
        animalWelfareScore: 100,
        biodiversityImpact: 18,
        supplyChainRisk: 24,
        verificationStatus: "accepted",
        riskScore: 0,
        flags: [],
        createdAt: bootedAt,
      },
    ],
    inspections: [
      inspectContent({
        actor: "seeded-governance-agent",
        direction: "ingress",
        content: "Summarize the procurement risk and preserve the audit references.",
      }),
    ],
    jurisdictions: [
      {
        id: "jur_seed_foundation_001",
        name: "Founding City Pilot",
        region: "Earth / European civic pilot",
        governanceModel: "Charter city with citizen oversight board",
        population: 250_000,
        status: "pilot",
        modules: ["GovLedger", "Impact Ledger", "AI DPI", "Jurisdiction Registry"],
        createdAt: bootedAt,
      },
    ],
    auditEvents: [
      {
        id: "audit_seed_bootstrap",
        type: "system.bootstrap",
        summary: "The Architect pilot store initialized with GovLedger, Impact Ledger, and DPI seed records.",
        severity: "info",
        createdAt: bootedAt,
      },
    ],
  };
}

function normalizeStore(store: ArchitectStore) {
  store.transactions ??= [];
  store.impactEntries ??= [];
  store.inspections ??= [];
  store.jurisdictions ??= createSeedStore().jurisdictions;
  store.auditEvents ??= [];
  return store;
}

function loadStore(): ArchitectStore {
  if (!existsSync(storePath)) {
    return createSeedStore();
  }

  try {
    return normalizeStore(JSON.parse(readFileSync(storePath, "utf8")) as ArchitectStore);
  } catch {
    return createSeedStore();
  }
}

function saveStore() {
  const store = getStore();
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(storePath, JSON.stringify(store, null, 2));
}

export function getStore() {
  const globalStore = globalThis as GlobalStore;
  globalStore.__theArchitectStore ??= loadStore();
  return globalStore.__theArchitectStore;
}

function statusFromRisk(riskScore: number): ReviewStatus {
  if (riskScore >= 75) return "quarantined";
  if (riskScore >= 25) return "pending_review";
  return "accepted";
}

function audit(severity: AuditEvent["severity"], summary: string, type: AuditEvent["type"], referenceId?: string) {
  getStore().auditEvents.unshift({
    id: createId("audit"),
    type,
    summary,
    severity,
    referenceId,
    createdAt: nowIso(),
  });
}

export function addGovLedgerTransaction(input: GovLedgerTransactionInput) {
  const risk = scoreGovLedgerTransaction(input);
  const transaction: GovLedgerTransaction = {
    id: createId("gov"),
    ...input,
    status: statusFromRisk(risk.riskScore),
    riskScore: risk.riskScore,
    flags: risk.flags,
    createdAt: nowIso(),
  };

  getStore().transactions.unshift(transaction);
  audit(
    transaction.status === "accepted" ? "info" : "warning",
    `${transaction.institution} recorded ${transaction.currency} ${transaction.amount.toLocaleString()} for ${transaction.category}.`,
    "govledger.transaction",
    transaction.id,
  );
  saveStore();

  return transaction;
}

export function addImpactLedgerEntry(input: ImpactLedgerEntryInput) {
  const risk = scoreImpactEntry(input);
  const entry: ImpactLedgerEntry = {
    id: createId("impact"),
    ...input,
    verificationStatus: statusFromRisk(risk.riskScore),
    riskScore: risk.riskScore,
    flags: risk.flags,
    createdAt: nowIso(),
  };

  getStore().impactEntries.unshift(entry);
  audit(
    entry.verificationStatus === "accepted" ? "info" : "warning",
    `${entry.actorName} submitted ${entry.reportingPeriod} impact data for ${entry.sector}.`,
    "impact.entry",
    entry.id,
  );
  saveStore();

  return entry;
}

export function addDpiInspection(input: DpiInspectionInput) {
  const inspection = inspectContent(input);
  getStore().inspections.unshift(inspection);
  audit(
    inspection.action === "ALLOW" || inspection.action === "LOG" ? "info" : "critical",
    `${inspection.action} for ${inspection.direction} AI content from ${inspection.actor}.`,
    "security.inspection",
    inspection.id,
  );
  saveStore();
  return inspection;
}

export function addJurisdiction(input: JurisdictionInput) {
  const jurisdiction: Jurisdiction = {
    id: createId("jur"),
    ...input,
    createdAt: nowIso(),
  };

  getStore().jurisdictions.unshift(jurisdiction);
  audit(
    jurisdiction.status === "paused" ? "warning" : "info",
    `${jurisdiction.name} registered as ${jurisdiction.status} with ${jurisdiction.modules.length} active platform modules.`,
    "jurisdiction.onboarding",
    jurisdiction.id,
  );
  saveStore();

  return jurisdiction;
}

export function updateReviewStatus(id: string, status: ReviewStatus) {
  const store = getStore();
  const transaction = store.transactions.find((item) => item.id === id);

  if (transaction) {
    transaction.status = status;
    audit("info", `Review status for GovLedger transaction ${id} changed to ${status}.`, "govledger.transaction", id);
    saveStore();
    return { kind: "govledger", item: transaction };
  }

  const impactEntry = store.impactEntries.find((item) => item.id === id);

  if (impactEntry) {
    impactEntry.verificationStatus = status;
    audit("info", `Review status for Impact Ledger entry ${id} changed to ${status}.`, "impact.entry", id);
    saveStore();
    return { kind: "impact", item: impactEntry };
  }

  return null;
}