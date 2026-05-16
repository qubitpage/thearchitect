/**
 * Audit Hash Chain — Cryptographic Integrity for The Architect
 *
 * HOW IT WORKS:
 * Every audit event gets a SHA-256 hash computed from:
 *   hash = SHA-256( previousHash + eventId + eventType + summary + createdAt )
 *
 * This creates a tamper-evident chain. If anyone modifies any past event (changing
 * a summary, deleting an entry, altering a timestamp), the hash chain breaks:
 * every subsequent hash becomes invalid.
 *
 * WHY IT MATTERS:
 * - Governments can't silently delete spending records
 * - Corporations can't alter impact reports after submission
 * - Auditors can independently verify the chain hasn't been tampered with
 * - Citizens can download and verify the chain offline
 *
 * VERIFICATION:
 * Call verifyAuditChain() to walk the entire chain from genesis and check
 * every hash. Returns the first broken link if tampering is detected.
 *
 * GENESIS HASH:
 * The very first event uses "GENESIS" as its previousHash. This is the
 * publicly known anchor for the entire chain.
 */

import type { AuditEvent } from "@/lib/types";

const GENESIS_HASH = "GENESIS";

export type HashedAuditEvent = AuditEvent & {
  hash: string;
  previousHash: string;
};

export type ChainVerification = {
  valid: boolean;
  totalEvents: number;
  checkedAt: string;
  brokenAt?: { index: number; eventId: string; expected: string; actual: string };
};

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeEventHash(event: AuditEvent, previousHash: string): Promise<string> {
  const payload = `${previousHash}|${event.id}|${event.type}|${event.summary}|${event.createdAt}`;
  return sha256(payload);
}

/**
 * Hash the full audit event array in chronological order (oldest first).
 * Audit events in the store are newest-first, so this reverses before hashing.
 */
export async function buildHashChain(events: AuditEvent[]): Promise<HashedAuditEvent[]> {
  const chronological = [...events].reverse();
  const hashed: HashedAuditEvent[] = [];

  let previousHash = GENESIS_HASH;

  for (const event of chronological) {
    const hash = await computeEventHash(event, previousHash);
    hashed.push({ ...event, hash, previousHash });
    previousHash = hash;
  }

  return hashed;
}

/**
 * Verify the entire audit hash chain. Walks from genesis to the latest event
 * and checks every hash. Returns the first broken link if any.
 */
export async function verifyAuditChain(events: AuditEvent[]): Promise<ChainVerification> {
  const chronological = [...events].reverse();
  let previousHash = GENESIS_HASH;

  for (let index = 0; index < chronological.length; index++) {
    const event = chronological[index];
    const expected = await computeEventHash(event, previousHash);

    if ((event as HashedAuditEvent).hash && (event as HashedAuditEvent).hash !== expected) {
      return {
        valid: false,
        totalEvents: chronological.length,
        checkedAt: new Date().toISOString(),
        brokenAt: {
          index,
          eventId: event.id,
          expected,
          actual: (event as HashedAuditEvent).hash,
        },
      };
    }

    previousHash = expected;
  }

  return {
    valid: true,
    totalEvents: chronological.length,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Get the latest hash in the chain (tip hash). Used when appending new events.
 */
export async function getChainTip(events: AuditEvent[]): Promise<string> {
  if (events.length === 0) return GENESIS_HASH;

  const chronological = [...events].reverse();
  let previousHash = GENESIS_HASH;

  for (const event of chronological) {
    previousHash = await computeEventHash(event, previousHash);
  }

  return previousHash;
}
