/**
 * Platform Health Check — Real subsystem verification
 *
 * Unlike the static getPlatformHealth() in platform.ts, this module
 * actually tests each subsystem by loading and probing it.
 * Separated to avoid circular imports (platform.ts is imported by snapshot.ts
 * which depends on store.ts).
 */

import { getStore } from "@/lib/store";
import { inspectContent } from "@/lib/security-policy";
import { platformRoadmap } from "@/lib/platform";

export function getDeepHealthCheck() {
  let allOk = true;
  const subsystems: { name: string; status: string; detail?: string }[] = [];

  try {
    const store = getStore();
    subsystems.push({ name: "GovLedger Store", status: store.transactions ? "ok" : "degraded" });
    subsystems.push({ name: "Impact Ledger Store", status: store.impactEntries ? "ok" : "degraded" });
    subsystems.push({ name: "Jurisdiction Registry", status: store.jurisdictions ? "ok" : "degraded" });
    subsystems.push({ name: "Audit Event Stream", status: store.auditEvents ? "ok" : "degraded" });
  } catch (error) {
    subsystems.push({ name: "Data Store", status: "error", detail: String(error) });
    allOk = false;
  }

  try {
    const result = inspectContent({ actor: "healthcheck", direction: "ingress", content: "test" });
    subsystems.push({ name: "AI DPI Firewall", status: result.action ? "ok" : "degraded" });
  } catch (error) {
    subsystems.push({ name: "AI DPI Firewall", status: "error", detail: String(error) });
    allOk = false;
  }

  return {
    ok: allOk,
    release: platformRoadmap.release,
    checkedAt: new Date().toISOString(),
    subsystems,
  };
}
