/**
 * Audit Service — SHA-256 tamper-evident chain backed by PostgreSQL.
 *
 * Every state change across all modules generates an audit event.
 * Events are chained: hash(prev_hash + id + type + summary + timestamp).
 * The chain is append-only and publicly verifiable.
 */

import { db, schema } from "@/lib/db";
import { emit, EventTypes, subscribe } from "@/lib/core/event-bus";
import { desc, eq, sql, count as drizzleCount } from "drizzle-orm";

const GENESIS_HASH = "GENESIS";

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getLastHash(): Promise<string> {
  const [last] = await db
    .select({ hash: schema.auditEvents.hash })
    .from(schema.auditEvents)
    .orderBy(desc(schema.auditEvents.seq))
    .limit(1);
  return last?.hash ?? GENESIS_HASH;
}

export async function appendAuditEvent(input: {
  type: string;
  summary: string;
  severity?: "info" | "warning" | "critical";
  referenceId?: string;
  referenceTable?: string;
  enterpriseId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; hash: string; seq: number }> {
  const previousHash = await getLastHash();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const hash = await sha256(
    `${previousHash}|${id}|${input.type}|${input.summary}|${now}`,
  );

  const [inserted] = await db
    .insert(schema.auditEvents)
    .values({
      id,
      type: input.type,
      summary: input.summary,
      severity: input.severity ?? "info",
      referenceId: input.referenceId,
      referenceTable: input.referenceTable,
      enterpriseId: input.enterpriseId,
      hash,
      previousHash,
      metadata: input.metadata ?? {},
    })
    .returning({ id: schema.auditEvents.id, hash: schema.auditEvents.hash, seq: schema.auditEvents.seq });

  // Emit event (non-blocking)
  emit({
    eventType: EventTypes.AUDIT_EVENT_APPENDED,
    sourceModule: "audit",
    payload: { id: inserted.id, type: input.type, severity: input.severity ?? "info" },
  }).catch(() => {});

  return inserted;
}

export async function verifyAuditChain(): Promise<{
  valid: boolean;
  totalEvents: number;
  checkedAt: string;
  brokenAt?: { index: number; eventId: string; expected: string; actual: string };
}> {
  const events = await db
    .select()
    .from(schema.auditEvents)
    .orderBy(schema.auditEvents.seq);

  let previousHash = GENESIS_HASH;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const expected = await sha256(
      `${previousHash}|${ev.id}|${ev.type}|${ev.summary}|${ev.createdAt.toISOString()}`,
    );
    if (expected !== ev.hash) {
      return {
        valid: false,
        totalEvents: events.length,
        checkedAt: new Date().toISOString(),
        brokenAt: { index: i, eventId: ev.id, expected, actual: ev.hash },
      };
    }
    previousHash = ev.hash;
  }

  return {
    valid: true,
    totalEvents: events.length,
    checkedAt: new Date().toISOString(),
  };
}

export async function getAuditChain(limit = 100, offset = 0) {
  return db
    .select()
    .from(schema.auditEvents)
    .orderBy(desc(schema.auditEvents.seq))
    .limit(limit)
    .offset(offset);
}

export async function getAuditCount(): Promise<number> {
  const [result] = await db
    .select({ count: drizzleCount() })
    .from(schema.auditEvents);
  return result?.count ?? 0;
}

// ─── Auto-register: subscribe to all events and audit them ──

subscribe("*", async (event) => {
  // Don't re-audit audit events (infinite loop)
  if (event.eventType === EventTypes.AUDIT_EVENT_APPENDED) return;

  try {
    await appendAuditEvent({
      type: event.eventType,
      summary: `[${event.sourceModule}] ${event.eventType}: ${JSON.stringify(event.payload).slice(0, 500)}`,
      severity: event.eventType.includes("blocked") || event.eventType.includes("broken") ? "warning" : "info",
      referenceId: (event.payload as Record<string, string>).id,
      metadata: { sourceEvent: event.eventType },
    });
  } catch {
    // Silent in case DB not ready
  }
});
