/**
 * LaborNet Module — Fair Labor Marketplace & Skills Registry
 *
 * Provides:
 * - Worker profile management with verified skills
 * - Labor contract lifecycle (draft → active → completed/disputed)
 * - Fairness scoring (auto-detects underpayment, overwork, etc.)
 * - Dispute filing and resolution
 * - Reputation tracking
 */

import { db, schema } from "@/lib/db";
import { emit, EventTypes } from "@/lib/core/event-bus";
import { eq, desc, count as drizzleCount, and, sql } from "drizzle-orm";

// ─── Worker Profiles ────────────────────────────────────────

export async function registerWorker(input: {
  identityId?: string;
  displayName: string;
  jurisdictionId?: string;
  skills: Array<{ name: string; level: string }>;
  hourlyRate?: number;
  currency?: string;
  availableHoursPerWeek?: number;
}) {
  const [worker] = await db
    .insert(schema.workerProfiles)
    .values({
      identityId: input.identityId,
      displayName: input.displayName,
      jurisdictionId: input.jurisdictionId,
      skills: input.skills,
      hourlyRate: input.hourlyRate,
      currency: input.currency ?? "USD",
      availableHoursPerWeek: input.availableHoursPerWeek ?? 40,
    })
    .returning();

  await emit({
    eventType: EventTypes.LABORNET_WORKER_REGISTERED,
    sourceModule: "labornet",
    payload: {
      workerId: worker.id,
      displayName: worker.displayName,
      skillCount: input.skills.length,
    },
  });

  return worker;
}

export async function getWorkerById(id: string) {
  const [worker] = await db
    .select()
    .from(schema.workerProfiles)
    .where(eq(schema.workerProfiles.id, id))
    .limit(1);
  return worker ?? null;
}

export async function listWorkers(opts?: {
  jurisdictionId?: string;
  skill?: string;
  limit?: number;
}) {
  const limit = opts?.limit ?? 50;
  const conditions = [eq(schema.workerProfiles.isActive, true)];

  if (opts?.jurisdictionId) {
    conditions.push(eq(schema.workerProfiles.jurisdictionId, opts.jurisdictionId));
  }

  return db
    .select()
    .from(schema.workerProfiles)
    .where(and(...conditions))
    .orderBy(desc(schema.workerProfiles.reputationScore))
    .limit(limit);
}

export async function updateWorkerSkills(
  id: string,
  skills: Array<{ name: string; level: string; verifiedAt?: string; verifiedBy?: string }>,
) {
  const [updated] = await db
    .update(schema.workerProfiles)
    .set({ skills, updatedAt: new Date() })
    .where(eq(schema.workerProfiles.id, id))
    .returning();
  return updated ?? null;
}

// ─── Labor Contracts ────────────────────────────────────────

function calculateFairnessScore(input: {
  hourlyRate: number;
  hoursPerWeek: number;
  currency: string;
}): { score: number; flags: string[] } {
  let score = 80;
  const flags: string[] = [];

  // Minimum wage check (rough USD baseline)
  if (input.currency === "USD" && input.hourlyRate < 15) {
    score -= 30;
    flags.push("below_minimum_wage");
  } else if (input.currency === "USD" && input.hourlyRate < 25) {
    score -= 10;
    flags.push("low_wage");
  }

  // Overwork detection
  if (input.hoursPerWeek > 60) {
    score -= 25;
    flags.push("excessive_hours");
  } else if (input.hoursPerWeek > 48) {
    score -= 10;
    flags.push("long_hours");
  }

  // Good conditions bonus
  if (input.hourlyRate >= 50 && input.hoursPerWeek <= 40) {
    score = Math.min(score + 10, 100);
  }

  return { score: Math.max(0, Math.min(100, score)), flags };
}

export async function createContract(input: {
  workerId: string;
  employerId?: string;
  employerName: string;
  title: string;
  description: string;
  skills?: string[];
  hourlyRate: number;
  currency?: string;
  hoursPerWeek?: number;
  startsAt?: string;
  endsAt?: string;
}) {
  const currency = input.currency ?? "USD";
  const hoursPerWeek = input.hoursPerWeek ?? 40;

  const { score, flags } = calculateFairnessScore({
    hourlyRate: input.hourlyRate,
    hoursPerWeek,
    currency,
  });

  const [contract] = await db
    .insert(schema.laborContracts)
    .values({
      workerId: input.workerId,
      employerId: input.employerId,
      employerName: input.employerName,
      title: input.title,
      description: input.description,
      skills: input.skills ?? [],
      hourlyRate: input.hourlyRate,
      currency,
      hoursPerWeek,
      fairnessScore: score,
      flags,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
    })
    .returning();

  // Update worker total contracts
  await db
    .update(schema.workerProfiles)
    .set({
      totalContracts: sql`${schema.workerProfiles.totalContracts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.workerProfiles.id, input.workerId));

  await emit({
    eventType: EventTypes.LABORNET_CONTRACT_CREATED,
    sourceModule: "labornet",
    payload: {
      contractId: contract.id,
      workerId: input.workerId,
      employerName: input.employerName,
      fairnessScore: score,
      flags,
    },
  });

  return contract;
}

export async function activateContract(id: string) {
  const [updated] = await db
    .update(schema.laborContracts)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(schema.laborContracts.id, id))
    .returning();
  return updated ?? null;
}

export async function completeContract(id: string) {
  const [contract] = await db
    .select()
    .from(schema.laborContracts)
    .where(eq(schema.laborContracts.id, id))
    .limit(1);

  if (!contract) return null;

  const [updated] = await db
    .update(schema.laborContracts)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(schema.laborContracts.id, id))
    .returning();

  // Update worker completed contracts + reputation
  await db
    .update(schema.workerProfiles)
    .set({
      completedContracts: sql`${schema.workerProfiles.completedContracts} + 1`,
      reputationScore: sql`LEAST(100, ${schema.workerProfiles.reputationScore} + 2)`,
      updatedAt: new Date(),
    })
    .where(eq(schema.workerProfiles.id, contract.workerId));

  await emit({
    eventType: EventTypes.LABORNET_CONTRACT_COMPLETED,
    sourceModule: "labornet",
    payload: {
      contractId: id,
      workerId: contract.workerId,
    },
  });

  return updated;
}

export async function listContracts(opts?: {
  workerId?: string;
  employerId?: string;
  status?: string;
  limit?: number;
}) {
  const limit = opts?.limit ?? 50;
  const conditions = [];

  if (opts?.workerId) {
    conditions.push(eq(schema.laborContracts.workerId, opts.workerId));
  }
  if (opts?.employerId) {
    conditions.push(eq(schema.laborContracts.employerId, opts.employerId));
  }
  if (opts?.status) {
    conditions.push(eq(schema.laborContracts.status, opts.status as "draft" | "active" | "completed" | "disputed" | "terminated"));
  }

  let q = db.select().from(schema.laborContracts);
  if (conditions.length > 0) {
    q = q.where(and(...conditions)) as typeof q;
  }

  return q.orderBy(desc(schema.laborContracts.createdAt)).limit(limit);
}

export async function getContractById(id: string) {
  const [contract] = await db
    .select()
    .from(schema.laborContracts)
    .where(eq(schema.laborContracts.id, id))
    .limit(1);
  return contract ?? null;
}

// ─── Disputes ───────────────────────────────────────────────

export async function fileDispute(input: {
  contractId: string;
  filedBy: "worker" | "employer";
  reason: string;
  description: string;
}) {
  // Mark contract as disputed
  await db
    .update(schema.laborContracts)
    .set({ status: "disputed", updatedAt: new Date() })
    .where(eq(schema.laborContracts.id, input.contractId));

  const [dispute] = await db
    .insert(schema.laborDisputes)
    .values({
      contractId: input.contractId,
      filedBy: input.filedBy,
      reason: input.reason,
      description: input.description,
    })
    .returning();

  // Reputation hit
  const contract = await getContractById(input.contractId);
  if (contract) {
    const targetId =
      input.filedBy === "worker" ? contract.workerId : contract.workerId;
    await db
      .update(schema.workerProfiles)
      .set({
        disputeRate: sql`CASE WHEN ${schema.workerProfiles.totalContracts} > 0
          THEN (SELECT COUNT(*)::real FROM labor_disputes d
                JOIN labor_contracts c ON d.contract_id = c.id
                WHERE c.worker_id = ${targetId}) / ${schema.workerProfiles.totalContracts}
          ELSE 0 END`,
        updatedAt: new Date(),
      })
      .where(eq(schema.workerProfiles.id, contract.workerId));
  }

  await emit({
    eventType: EventTypes.LABORNET_DISPUTE_FILED,
    sourceModule: "labornet",
    payload: {
      disputeId: dispute.id,
      contractId: input.contractId,
      filedBy: input.filedBy,
      reason: input.reason,
    },
  });

  return dispute;
}

export async function resolveDispute(
  id: string,
  resolution: string,
  resolvedBy: string,
) {
  const [updated] = await db
    .update(schema.laborDisputes)
    .set({
      status: "resolved",
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.laborDisputes.id, id))
    .returning();

  return updated ?? null;
}

export async function listDisputes(opts?: {
  contractId?: string;
  status?: string;
  limit?: number;
}) {
  const limit = opts?.limit ?? 50;
  const conditions = [];

  if (opts?.contractId) {
    conditions.push(eq(schema.laborDisputes.contractId, opts.contractId));
  }
  if (opts?.status) {
    conditions.push(eq(schema.laborDisputes.status, opts.status));
  }

  let q = db.select().from(schema.laborDisputes);
  if (conditions.length > 0) {
    q = q.where(and(...conditions)) as typeof q;
  }

  return q.orderBy(desc(schema.laborDisputes.createdAt)).limit(limit);
}

// ─── Metrics ────────────────────────────────────────────────

export async function getLaborNetMetrics() {
  const [workerCount] = await db
    .select({ count: drizzleCount() })
    .from(schema.workerProfiles)
    .where(eq(schema.workerProfiles.isActive, true));

  const [contractCount] = await db
    .select({ count: drizzleCount() })
    .from(schema.laborContracts);

  const [activeContracts] = await db
    .select({ count: drizzleCount() })
    .from(schema.laborContracts)
    .where(eq(schema.laborContracts.status, "active"));

  const [disputeCount] = await db
    .select({ count: drizzleCount() })
    .from(schema.laborDisputes)
    .where(eq(schema.laborDisputes.status, "open"));

  const [avgFairness] = await db
    .select({ avg: sql<number>`AVG(${schema.laborContracts.fairnessScore})` })
    .from(schema.laborContracts);

  return {
    totalWorkers: workerCount?.count ?? 0,
    totalContracts: contractCount?.count ?? 0,
    activeContracts: activeContracts?.count ?? 0,
    openDisputes: disputeCount?.count ?? 0,
    averageFairnessScore: Math.round(avgFairness?.avg ?? 0),
  };
}
