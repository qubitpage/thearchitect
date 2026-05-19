/**
 * Jurisdiction Service — Federation Registry
 *
 * Manages the lifecycle of participating nations/cities:
 * candidate → pilot → active → paused → withdrawn
 */

import { db, schema } from "@/lib/db";
import { emit, EventTypes } from "@/lib/core/event-bus";
import { eq, desc, count as drizzleCount } from "drizzle-orm";

export async function createJurisdiction(input: {
  name: string;
  region: string;
  governanceModel: string;
  population?: number;
  modules?: string[];
}) {
  const [jurisdiction] = await db
    .insert(schema.jurisdictions)
    .values({
      name: input.name,
      region: input.region,
      governanceModel: input.governanceModel,
      population: input.population ?? 0,
      status: "candidate",
      modules: input.modules ?? ["govledger"],
    })
    .returning();

  await emit({
    eventType: EventTypes.JURISDICTION_CREATED,
    sourceModule: "jurisdiction",
    payload: { id: jurisdiction.id, name: jurisdiction.name, region: jurisdiction.region },
  });

  return jurisdiction;
}

export async function updateJurisdictionStatus(
  id: string,
  status: "candidate" | "pilot" | "active" | "paused" | "withdrawn",
) {
  const [updated] = await db
    .update(schema.jurisdictions)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.jurisdictions.id, id))
    .returning();

  if (updated) {
    await emit({
      eventType: EventTypes.JURISDICTION_STATUS_CHANGED,
      sourceModule: "jurisdiction",
      payload: { id, name: updated.name, oldStatus: updated.status, newStatus: status },
    });
  }

  return updated;
}

export async function listJurisdictions(opts?: { status?: string; limit?: number }) {
  let query = db.select().from(schema.jurisdictions);
  if (opts?.status) {
    query = query.where(eq(schema.jurisdictions.status, opts.status as "candidate" | "pilot" | "active" | "paused" | "withdrawn")) as typeof query;
  }
  return query.orderBy(desc(schema.jurisdictions.createdAt)).limit(opts?.limit ?? 100);
}

export async function getJurisdictionById(id: string) {
  const [j] = await db
    .select()
    .from(schema.jurisdictions)
    .where(eq(schema.jurisdictions.id, id))
    .limit(1);
  return j;
}

export async function getJurisdictionMetrics() {
  const [total] = await db.select({ count: drizzleCount() }).from(schema.jurisdictions);
  const [active] = await db
    .select({ count: drizzleCount() })
    .from(schema.jurisdictions)
    .where(eq(schema.jurisdictions.status, "active"));

  return {
    total: total?.count ?? 0,
    active: active?.count ?? 0,
  };
}
