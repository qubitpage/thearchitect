import { TransparencyPortal } from "@/components/TransparencyPortal";
import { getSystemSnapshot } from "@/lib/snapshot";
import { buildHashChain, verifyAuditChain } from "@/lib/audit-chain";
import { getStore } from "@/lib/store";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Architect — Public Transparency Portal",
  description: "Public read-only view of government spending, environmental impact, and audit integrity.",
};

export default async function TransparencyPage() {
  const snapshot = getSystemSnapshot();
  const store = getStore();
  const chain = await buildHashChain(store.auditEvents);
  const verification = await verifyAuditChain(store.auditEvents);

  return (
    <TransparencyPortal
      snapshot={snapshot}
      auditChain={chain}
      chainVerification={verification}
    />
  );
}
