/**
 * Event Bus — Cross-Module Communication Layer
 *
 * All modules emit events when state changes. Other modules subscribe
 * to events they care about. This is the glue that lets GovLedger,
 * Enterprise, Impact Ledger, DPI, and Audit work together.
 *
 * Events are persisted to PostgreSQL for replay and audit, but also
 * dispatched in-process for immediate reactions.
 *
 * Event naming: module.entity.action
 *   e.g. "govledger.transaction.created"
 *        "enterprise.inspection.blocked"
 *        "audit.chain.appended"
 */

import { db, schema } from "@/lib/db";
import { nowIso } from "@/lib/ids";

export type ArchitectEvent = {
  id?: string;
  eventType: string;
  sourceModule: string;
  payload: Record<string, unknown>;
  createdAt?: string;
};

type EventHandler = (event: ArchitectEvent) => void | Promise<void>;

// In-process subscriber registry (survives HMR via globalThis)
type GlobalBus = typeof globalThis & {
  __architectEventHandlers?: Map<string, Set<EventHandler>>;
};

function getHandlers(): Map<string, Set<EventHandler>> {
  const g = globalThis as GlobalBus;
  g.__architectEventHandlers ??= new Map();
  return g.__architectEventHandlers;
}

/**
 * Subscribe to events matching a pattern.
 * Pattern can be exact ("govledger.transaction.created") or
 * wildcard ("govledger.*" or "*").
 */
export function subscribe(pattern: string, handler: EventHandler): () => void {
  const handlers = getHandlers();
  if (!handlers.has(pattern)) handlers.set(pattern, new Set());
  handlers.get(pattern)!.add(handler);
  return () => handlers.get(pattern)?.delete(handler);
}

/**
 * Emit an event — persists to DB and dispatches to in-process handlers.
 */
export async function emit(event: ArchitectEvent): Promise<void> {
  // 1. Persist to event_bus table
  try {
    await db.insert(schema.eventBus).values({
      eventType: event.eventType,
      sourceModule: event.sourceModule,
      payload: event.payload,
    });
  } catch {
    // DB might not be connected yet (dev mode, JSON fallback)
    // Events still dispatch in-process
  }

  // 2. Dispatch to in-process handlers
  const handlers = getHandlers();
  const dispatches: Promise<void>[] = [];

  for (const [pattern, subs] of handlers) {
    const matches =
      pattern === "*" ||
      pattern === event.eventType ||
      (pattern.endsWith(".*") && event.eventType.startsWith(pattern.slice(0, -1)));

    if (matches) {
      for (const handler of subs) {
        dispatches.push(
          Promise.resolve(handler(event)).catch((err) => {
            console.error(`[event-bus] Handler error for ${event.eventType}:`, err);
          }),
        );
      }
    }
  }

  await Promise.allSettled(dispatches);
}

// ─── Well-Known Event Types ─────────────────────────────────

export const EventTypes = {
  // GovLedger
  GOVLEDGER_TX_CREATED: "govledger.transaction.created",
  GOVLEDGER_TX_REVIEWED: "govledger.transaction.reviewed",
  GOVLEDGER_TX_FLAGGED: "govledger.transaction.flagged",

  // Impact Ledger
  IMPACT_ENTRY_CREATED: "impact.entry.created",
  IMPACT_ENTRY_VERIFIED: "impact.entry.verified",
  IMPACT_ENTRY_FLAGGED: "impact.entry.flagged",

  // DPI / Security
  DPI_INSPECTION_COMPLETED: "dpi.inspection.completed",
  DPI_THREAT_BLOCKED: "dpi.threat.blocked",
  DPI_HUMAN_REVIEW_REQUIRED: "dpi.human_review.required",

  // Enterprise
  ENTERPRISE_REGISTERED: "enterprise.registered",
  ENTERPRISE_INSPECTION: "enterprise.inspection.completed",
  ENTERPRISE_AGENT_TASK: "enterprise.agent.task_completed",

  // CorpLedger
  CORPLEDGER_TX_CREATED: "corpledger.transaction.created",
  CORPLEDGER_TX_REVIEWED: "corpledger.transaction.reviewed",

  // Merit
  MERIT_EVALUATION_SUBMITTED: "merit.evaluation.submitted",
  MERIT_BIAS_DETECTED: "merit.bias.detected",

  // Voting
  VOTING_PROPOSAL_CREATED: "voting.proposal.created",
  VOTING_PROPOSAL_CLOSED: "voting.proposal.closed",
  VOTING_VOTE_CAST: "voting.vote.cast",

  // Audit
  AUDIT_EVENT_APPENDED: "audit.event.appended",
  AUDIT_CHAIN_VERIFIED: "audit.chain.verified",
  AUDIT_CHAIN_BROKEN: "audit.chain.broken",

  // Jurisdiction
  JURISDICTION_CREATED: "jurisdiction.created",
  JURISDICTION_STATUS_CHANGED: "jurisdiction.status.changed",

  // GovOS
  GOVOS_IDENTITY_REGISTERED: "govos.identity.registered",
  GOVOS_IDENTITY_VERIFIED: "govos.identity.verified",
  GOVOS_SERVICE_CREATED: "govos.service.created",
  GOVOS_REQUEST_SUBMITTED: "govos.request.submitted",
  GOVOS_REQUEST_PROCESSED: "govos.request.processed",

  // LaborNet
  LABORNET_WORKER_REGISTERED: "labornet.worker.registered",
  LABORNET_CONTRACT_CREATED: "labornet.contract.created",
  LABORNET_CONTRACT_COMPLETED: "labornet.contract.completed",
  LABORNET_DISPUTE_FILED: "labornet.dispute.filed",
  LABORNET_DISPUTE_RESOLVED: "labornet.dispute.resolved",
} as const;
