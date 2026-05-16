/**
 * Export Bundles — Verifiable Data Packages for The Architect
 *
 * HOW IT WORKS:
 * An export bundle is a signed JSON package containing:
 * 1. Full system snapshot (all transactions, impact entries, inspections, jurisdictions)
 * 2. Complete audit hash chain (every event with its SHA-256 hash)
 * 3. Chain verification result (proves chain integrity at export time)
 * 4. Bundle metadata (timestamp, version, exporter role)
 *
 * WHY IT MATTERS:
 * - Any citizen, journalist, or auditor can download a bundle
 * - They can verify offline that the hash chain is intact
 * - They can compare bundles from different times to detect changes
 * - Data can be imported into other systems for independent analysis
 * - This is the foundation for inter-jurisdiction data portability
 *
 * BUNDLE FORMAT:
 * {
 *   bundleId: string,
 *   exportedAt: string,
 *   exportedBy: { role: string },
 *   version: string,
 *   verification: ChainVerification,
 *   snapshot: SystemSnapshot,
 *   auditChain: HashedAuditEvent[],
 *   bundleHash: string    // SHA-256 of the entire payload for bundle integrity
 * }
 */

import type { Role } from "@/lib/auth";
import type { ChainVerification, HashedAuditEvent } from "@/lib/audit-chain";
import { buildHashChain, verifyAuditChain } from "@/lib/audit-chain";
import { createId, nowIso } from "@/lib/ids";
import { getPlatformRoadmap } from "@/lib/platform";
import { getStore } from "@/lib/store";
import type { SystemSnapshot } from "@/lib/types";

export type ExportBundle = {
  bundleId: string;
  exportedAt: string;
  exportedBy: { role: Role };
  version: string;
  verification: ChainVerification;
  snapshot: SystemSnapshot;
  auditChain: HashedAuditEvent[];
  bundleHash: string;
};

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateExportBundle(role: Role): Promise<ExportBundle> {
  const store = getStore();
  const roadmap = getPlatformRoadmap();

  const snapshot: SystemSnapshot = {
    generatedAt: nowIso(),
    metrics: {
      publicSpend: store.transactions.reduce((t, i) => t + i.amount, 0),
      transactions: store.transactions.length,
      impactEntries: store.impactEntries.length,
      pendingReviews:
        store.transactions.filter((i) => i.status === "pending_review").length +
        store.impactEntries.filter((i) => i.verificationStatus === "pending_review").length,
      quarantinedItems:
        store.transactions.filter((i) => i.status === "quarantined").length +
        store.impactEntries.filter((i) => i.verificationStatus === "quarantined").length +
        store.inspections.filter((i) => i.action === "QUARANTINE" || i.action === "DENY").length,
      averageImpactRisk: store.impactEntries.length
        ? Math.round(store.impactEntries.reduce((t, i) => t + i.riskScore, 0) / store.impactEntries.length)
        : 0,
      inspections: store.inspections.length,
      jurisdictions: store.jurisdictions.length,
      activeJurisdictions: store.jurisdictions.filter((j) => j.status === "active" || j.status === "pilot").length,
    },
    platform: roadmap,
    jurisdictions: store.jurisdictions,
    transactions: store.transactions,
    impactEntries: store.impactEntries,
    inspections: store.inspections,
    auditEvents: store.auditEvents,
  };

  const auditChain = await buildHashChain(store.auditEvents);
  const verification = await verifyAuditChain(store.auditEvents);

  const bundlePayload = {
    bundleId: createId("bundle"),
    exportedAt: nowIso(),
    exportedBy: { role },
    version: roadmap.release,
    verification,
    snapshot,
    auditChain,
  };

  const bundleHash = await sha256(JSON.stringify(bundlePayload));

  return { ...bundlePayload, bundleHash };
}
