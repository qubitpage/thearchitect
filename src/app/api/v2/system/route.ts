/**
 * GET /api/v2/system — Full system snapshot with metrics
 */

import { db, schema } from "@/lib/db";
import { getAuditCount } from "@/lib/core/audit";
import { count as drizzleCount, sum, avg, eq } from "drizzle-orm";

export async function GET() {
  try {
    const [txMetrics] = await db.select({
      count: drizzleCount(),
      totalSpend: sum(schema.govledgerTransactions.amount),
    }).from(schema.govledgerTransactions);

    const [impactMetrics] = await db.select({
      count: drizzleCount(),
      avgRisk: avg(schema.impactLedgerEntries.riskScore),
    }).from(schema.impactLedgerEntries);

    const [pendingReviews] = await db.select({ count: drizzleCount() })
      .from(schema.govledgerTransactions)
      .where(eq(schema.govledgerTransactions.status, "pending_review"));

    const [quarantined] = await db.select({ count: drizzleCount() })
      .from(schema.govledgerTransactions)
      .where(eq(schema.govledgerTransactions.status, "quarantined"));

    const [dpiCount] = await db.select({ count: drizzleCount() }).from(schema.dpiInspections);
    const [jCount] = await db.select({ count: drizzleCount() }).from(schema.jurisdictions);
    const [jActive] = await db.select({ count: drizzleCount() })
      .from(schema.jurisdictions)
      .where(eq(schema.jurisdictions.status, "active"));
    const [entCount] = await db.select({ count: drizzleCount() }).from(schema.enterprises);

    const auditCount = await getAuditCount();

    const modules = await db.select().from(schema.platformModules);
    const milestones = await db.select().from(schema.platformMilestones);

    return Response.json({
      version: "4.1.0",
      generatedAt: new Date().toISOString(),
      persistence: "postgresql",
      metrics: {
        publicSpend: Number(txMetrics?.totalSpend ?? 0),
        transactions: txMetrics?.count ?? 0,
        impactEntries: impactMetrics?.count ?? 0,
        pendingReviews: pendingReviews?.count ?? 0,
        quarantinedItems: quarantined?.count ?? 0,
        averageImpactRisk: Math.round(Number(impactMetrics?.avgRisk ?? 0)),
        inspections: dpiCount?.count ?? 0,
        jurisdictions: jCount?.count ?? 0,
        activeJurisdictions: jActive?.count ?? 0,
        enterprises: entCount?.count ?? 0,
        auditEvents: auditCount,
      },
      platform: {
        release: "4.1.0",
        sourceRepository: "https://github.com/qubitpage/thearchitect",
        constitutionUrl: "https://quantumqub.com/constitution.html",
        modules,
        milestones,
      },
    });
  } catch (err) {
    return Response.json({ error: "Database not available", details: String(err) }, { status: 503 });
  }
}
