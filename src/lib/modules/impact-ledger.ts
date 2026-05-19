/**
 * Impact Ledger Service — Universal Sector Accountability
 *
 * Every business must account for: emissions, water, waste, labor,
 * animal welfare, biodiversity, supply chain, community, tax.
 */

import { db, schema } from "@/lib/db";
import { emit, EventTypes } from "@/lib/core/event-bus";
import { eq, desc, and, count as drizzleCount, avg } from "drizzle-orm";

// ─── Risk Scoring ───────────────────────────────────────────

function scoreImpactEntry(entry: {
  emissionsTonsCo2e: number;
  laborIncidents: number;
  supplyChainRisk: number;
  biodiversityImpact: number;
  animalWelfareScore: number;
}): { score: number; flags: string[] } {
  let score = 0;
  const flags: string[] = [];

  if (entry.emissionsTonsCo2e > 100_000) { score += 25; flags.push("high emissions exposure"); }
  else if (entry.emissionsTonsCo2e > 50_000) { score += 15; flags.push("moderate emissions"); }

  if (entry.laborIncidents > 0) { score += 20; flags.push("reported labor incidents"); }
  if (entry.supplyChainRisk > 50) { score += 15; flags.push("elevated supply chain risk"); }
  if (entry.biodiversityImpact < -10) { score += 15; flags.push("significant biodiversity impact"); }
  if (entry.animalWelfareScore < 50) { score += 10; flags.push("low animal welfare score"); }

  return { score: Math.min(score, 100), flags };
}

// ─── CRUD ───────────────────────────────────────────────────

export async function createImpactEntry(input: {
  actorName: string;
  sector: string;
  jurisdiction: string;
  jurisdictionId?: string;
  reportingPeriod: string;
  emissionsTonsCo2e?: number;
  waterM3?: number;
  wasteKg?: number;
  laborIncidents?: number;
  animalWelfareScore?: number;
  biodiversityImpact?: number;
  supplyChainRisk?: number;
  communityDisplacement?: number;
  taxTransparencyScore?: number;
  enterpriseId?: string;
}) {
  const emissions = input.emissionsTonsCo2e ?? 0;
  const labor = input.laborIncidents ?? 0;
  const supply = input.supplyChainRisk ?? 0;
  const biodiversity = input.biodiversityImpact ?? 0;
  const welfare = input.animalWelfareScore ?? 100;

  const { score, flags } = scoreImpactEntry({
    emissionsTonsCo2e: emissions,
    laborIncidents: labor,
    supplyChainRisk: supply,
    biodiversityImpact: biodiversity,
    animalWelfareScore: welfare,
  });

  const [entry] = await db
    .insert(schema.impactLedgerEntries)
    .values({
      actorName: input.actorName,
      sector: input.sector,
      jurisdiction: input.jurisdiction,
      jurisdictionId: input.jurisdictionId,
      reportingPeriod: input.reportingPeriod,
      emissionsTonsCo2e: emissions,
      waterM3: input.waterM3 ?? 0,
      wasteKg: input.wasteKg ?? 0,
      laborIncidents: labor,
      animalWelfareScore: welfare,
      biodiversityImpact: biodiversity,
      supplyChainRisk: supply,
      communityDisplacement: input.communityDisplacement ?? 0,
      taxTransparencyScore: input.taxTransparencyScore ?? 100,
      riskScore: score,
      flags,
      enterpriseId: input.enterpriseId,
      verificationStatus: score >= 50 ? "quarantined" : "pending_review",
    })
    .returning();

  await emit({
    eventType: score >= 50 ? EventTypes.IMPACT_ENTRY_FLAGGED : EventTypes.IMPACT_ENTRY_CREATED,
    sourceModule: "impact",
    payload: { id: entry.id, sector: entry.sector, riskScore: score, flags },
  });

  return entry;
}

export async function listImpactEntries(opts?: {
  sector?: string;
  status?: string;
  enterpriseId?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const conditions = [];

  if (opts?.sector) conditions.push(eq(schema.impactLedgerEntries.sector, opts.sector));
  if (opts?.status) conditions.push(eq(schema.impactLedgerEntries.verificationStatus, opts.status as "accepted" | "pending_review" | "quarantined" | "rejected"));
  if (opts?.enterpriseId) conditions.push(eq(schema.impactLedgerEntries.enterpriseId, opts.enterpriseId));

  let query = db.select().from(schema.impactLedgerEntries);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;

  return query
    .orderBy(desc(schema.impactLedgerEntries.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getImpactMetrics(enterpriseId?: string) {
  const conditions = enterpriseId
    ? [eq(schema.impactLedgerEntries.enterpriseId, enterpriseId)]
    : [];

  let query = db
    .select({
      totalEntries: drizzleCount(),
      avgRisk: avg(schema.impactLedgerEntries.riskScore),
    })
    .from(schema.impactLedgerEntries);

  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;

  const [metrics] = await query;
  return {
    totalEntries: metrics?.totalEntries ?? 0,
    averageRisk: Math.round(Number(metrics?.avgRisk ?? 0)),
  };
}
