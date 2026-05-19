/**
 * GovLedger Service — Public Financial Transparency Engine
 *
 * Every public financial transaction tracked with risk scoring,
 * review workflow, and full audit trail.
 */

import { db, schema } from "@/lib/db";
import { emit, EventTypes } from "@/lib/core/event-bus";
import { eq, desc, and, sql, count as drizzleCount, sum, avg } from "drizzle-orm";

// ─── Risk Scoring ───────────────────────────────────────────

function scoreTransaction(tx: {
  amount: number;
  category: string;
  counterparty: string;
  classification: string;
}): { score: number; flags: string[] } {
  let score = 0;
  const flags: string[] = [];

  if (tx.amount > 1_000_000) { score += 30; flags.push("high value contract"); }
  else if (tx.amount > 500_000) { score += 15; flags.push("significant expenditure"); }

  if (tx.classification === "classified") { score += 20; flags.push("classified transaction"); }
  if (tx.category === "defense" || tx.category === "military") { score += 15; flags.push("defense sector"); }
  if (tx.category === "consulting") { score += 10; flags.push("consulting engagement"); }

  // No-bid / sole-source indicators
  if (/sole.?source|no.?bid|direct.?award/i.test(tx.counterparty)) {
    score += 25; flags.push("potential no-bid contract");
  }

  return { score: Math.min(score, 100), flags };
}

// ─── CRUD ───────────────────────────────────────────────────

export async function createTransaction(input: {
  jurisdiction: string;
  jurisdictionId?: string;
  institution: string;
  counterparty: string;
  amount: number;
  currency?: string;
  category: string;
  purpose: string;
  classification?: "public" | "pseudonymized" | "classified";
}) {
  const { score, flags } = scoreTransaction({
    amount: input.amount,
    category: input.category,
    counterparty: input.counterparty,
    classification: input.classification ?? "public",
  });

  const [tx] = await db
    .insert(schema.govledgerTransactions)
    .values({
      jurisdiction: input.jurisdiction,
      jurisdictionId: input.jurisdictionId,
      institution: input.institution,
      counterparty: input.counterparty,
      amount: input.amount,
      currency: input.currency ?? "EUR",
      category: input.category,
      purpose: input.purpose,
      classification: input.classification ?? "public",
      riskScore: score,
      flags,
      status: score >= 50 ? "quarantined" : "pending_review",
    })
    .returning();

  await emit({
    eventType: score >= 50 ? EventTypes.GOVLEDGER_TX_FLAGGED : EventTypes.GOVLEDGER_TX_CREATED,
    sourceModule: "govledger",
    payload: { id: tx.id, amount: tx.amount, riskScore: score, flags },
  });

  return tx;
}

export async function listTransactions(opts?: {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = db.select().from(schema.govledgerTransactions);

  // Apply filters using where conditions
  const conditions = [];
  if (opts?.status) conditions.push(eq(schema.govledgerTransactions.status, opts.status as "accepted" | "pending_review" | "quarantined" | "rejected"));
  if (opts?.category) conditions.push(eq(schema.govledgerTransactions.category, opts.category));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query
    .orderBy(desc(schema.govledgerTransactions.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function reviewTransaction(
  id: string,
  action: "accepted" | "rejected" | "quarantined",
  reviewedBy?: string,
) {
  const [updated] = await db
    .update(schema.govledgerTransactions)
    .set({
      status: action,
      reviewedBy: reviewedBy,
      updatedAt: new Date(),
    })
    .where(eq(schema.govledgerTransactions.id, id))
    .returning();

  if (updated) {
    await emit({
      eventType: EventTypes.GOVLEDGER_TX_REVIEWED,
      sourceModule: "govledger",
      payload: { id, status: action, reviewedBy },
    });
  }

  return updated;
}

export async function getTransactionById(id: string) {
  const [tx] = await db
    .select()
    .from(schema.govledgerTransactions)
    .where(eq(schema.govledgerTransactions.id, id))
    .limit(1);
  return tx;
}

export async function getGovLedgerMetrics() {
  const [metrics] = await db
    .select({
      totalTransactions: drizzleCount(),
      totalSpend: sum(schema.govledgerTransactions.amount),
      avgRisk: avg(schema.govledgerTransactions.riskScore),
    })
    .from(schema.govledgerTransactions);

  const [pending] = await db
    .select({ count: drizzleCount() })
    .from(schema.govledgerTransactions)
    .where(eq(schema.govledgerTransactions.status, "pending_review"));

  const [quarantined] = await db
    .select({ count: drizzleCount() })
    .from(schema.govledgerTransactions)
    .where(eq(schema.govledgerTransactions.status, "quarantined"));

  return {
    totalTransactions: metrics?.totalTransactions ?? 0,
    totalSpend: Number(metrics?.totalSpend ?? 0),
    averageRisk: Math.round(Number(metrics?.avgRisk ?? 0)),
    pendingReviews: pending?.count ?? 0,
    quarantinedItems: quarantined?.count ?? 0,
  };
}
