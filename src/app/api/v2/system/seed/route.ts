/**
 * POST /api/v2/system/seed — Initialize database with seed data
 *
 * Creates demo jurisdictions, transactions, impact entries, and enterprises
 * for pilot testing. Idempotent — skips if data exists.
 */

import { db, schema } from "@/lib/db";
import { authorize } from "@/lib/core/rbac";
import { appendAuditEvent } from "@/lib/core/audit";
import { count as drizzleCount } from "drizzle-orm";

export async function POST(request: Request) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  // Check if already seeded
  const [txCount] = await db.select({ count: drizzleCount() }).from(schema.govledgerTransactions);
  if ((txCount?.count ?? 0) > 0) {
    return Response.json({ message: "Database already seeded", seeded: false });
  }

  // Seed jurisdictions
  const [j1] = await db.insert(schema.jurisdictions).values({
    name: "Founding City Pilot",
    region: "Northern Europe",
    governanceModel: "Parliamentary democracy with digital infrastructure",
    population: 450_000,
    status: "pilot",
    modules: ["govledger", "govos", "impact-ledger"],
  }).returning();

  const [j2] = await db.insert(schema.jurisdictions).values({
    name: "Tech Hub Municipality",
    region: "East Asia",
    governanceModel: "Smart city administration",
    population: 1_200_000,
    status: "candidate",
    modules: ["govledger"],
  }).returning();

  // Seed GovLedger transactions
  await db.insert(schema.govledgerTransactions).values([
    {
      jurisdictionId: j1.id,
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
    },
    {
      jurisdictionId: j1.id,
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
    },
    {
      jurisdictionId: j1.id,
      jurisdiction: "Founding City Pilot",
      institution: "Education Ministry",
      counterparty: "Digital Learning Foundation",
      amount: 350_000,
      currency: "EUR",
      category: "education",
      purpose: "Tablet procurement for 15,000 students with open-source curriculum.",
      classification: "public",
      status: "pending_review",
      riskScore: 5,
      flags: [],
    },
  ]);

  // Seed Impact Ledger entries
  await db.insert(schema.impactLedgerEntries).values([
    {
      actorName: "North Grid Energy",
      sector: "energy",
      jurisdictionId: j1.id,
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
    },
    {
      actorName: "Civic Vertical Farms",
      sector: "food",
      jurisdictionId: j1.id,
      jurisdiction: "Founding City Pilot",
      reportingPeriod: "2026-Q2",
      emissionsTonsCo2e: 1_900,
      waterM3: 14_000,
      wasteKg: 870,
      laborIncidents: 0,
      animalWelfareScore: 95,
      biodiversityImpact: 8,
      supplyChainRisk: 15,
      verificationStatus: "accepted",
      riskScore: 0,
      flags: [],
    },
  ]);

  // Seed platform modules
  await db.insert(schema.platformModules).values([
    { id: "govledger", name: "GovLedger", summary: "Real-time public finance transparency", status: "live", owner: "Foundation Core" },
    { id: "govos", name: "GovOS", summary: "Digital governance and identity", status: "building", owner: "Foundation Core" },
    { id: "workos", name: "WorkOS", summary: "AI labor classification and UBI", status: "planned", owner: "Labor Council" },
    { id: "lexglobal", name: "LexGlobal", summary: "Machine-readable law harmonization", status: "planned", owner: "Legal Council" },
    { id: "humanityos", name: "HumanityOS", summary: "Purpose infrastructure and exploration", status: "planned", owner: "Humanity Council" },
    { id: "impact-ledger", name: "Impact Ledger", summary: "Universal sector accountability", status: "live", owner: "Foundation Core" },
    { id: "dpi-engine", name: "DPI Engine", summary: "Lobster Trap deep prompt inspection", status: "live", owner: "Security Council" },
    { id: "audit-chain", name: "Audit Chain", summary: "SHA-256 tamper-evident audit trail", status: "live", owner: "Foundation Core" },
    { id: "enterprise", name: "Enterprise Module", summary: "Multi-tenant governance SaaS", status: "live", owner: "Enterprise Council" },
    { id: "corpledger", name: "CorpLedger", summary: "Corporate financial transparency", status: "live", owner: "Enterprise Council" },
    { id: "merit", name: "Merit Protocol", summary: "Evidence-based advancement system", status: "live", owner: "Enterprise Council" },
    { id: "voting", name: "Liquid Voting", summary: "Employee democracy platform", status: "live", owner: "Enterprise Council" },
  ]).onConflictDoNothing();

  // Genesis audit event
  await appendAuditEvent({
    type: "system.bootstrap",
    summary: "The Architect v4.1.0 — Database initialized with seed data. PostgreSQL persistence active.",
    severity: "info",
  });

  return Response.json({
    message: "Database seeded successfully",
    seeded: true,
    jurisdictions: 2,
    transactions: 3,
    impactEntries: 2,
    modules: 12,
  });
}
