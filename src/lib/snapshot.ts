import { getStore } from "@/lib/store";
import { getPlatformRoadmap } from "@/lib/platform";
import type { SystemSnapshot } from "@/lib/types";

export function getSystemSnapshot(): SystemSnapshot {
  const store = getStore();
  const pendingReviews =
    store.transactions.filter((item) => item.status === "pending_review").length +
    store.impactEntries.filter((item) => item.verificationStatus === "pending_review").length;
  const quarantinedItems =
    store.transactions.filter((item) => item.status === "quarantined").length +
    store.impactEntries.filter((item) => item.verificationStatus === "quarantined").length +
    store.inspections.filter((item) => item.action === "QUARANTINE" || item.action === "DENY").length;
  const averageImpactRisk = store.impactEntries.length
    ? Math.round(store.impactEntries.reduce((total, item) => total + item.riskScore, 0) / store.impactEntries.length)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      publicSpend: store.transactions.reduce((total, item) => total + item.amount, 0),
      transactions: store.transactions.length,
      impactEntries: store.impactEntries.length,
      pendingReviews,
      quarantinedItems,
      averageImpactRisk,
      inspections: store.inspections.length,
      jurisdictions: store.jurisdictions.length,
      activeJurisdictions: store.jurisdictions.filter((item) => item.status === "active" || item.status === "pilot").length,
    },
    platform: getPlatformRoadmap(),
    jurisdictions: store.jurisdictions.slice(0, 12),
    transactions: store.transactions.slice(0, 12),
    impactEntries: store.impactEntries.slice(0, 12),
    inspections: store.inspections.slice(0, 12),
    auditEvents: store.auditEvents.slice(0, 16),
  };
}