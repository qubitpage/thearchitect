"use client";

import {
  BadgeCheck,
  Building2,
  ExternalLink,
  Globe2,
  Landmark,
  Leaf,
  Link2,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { SystemSnapshot } from "@/lib/types";
import type { ChainVerification, HashedAuditEvent } from "@/lib/audit-chain";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadge(status: string) {
  const tone = ["accepted", "ALLOW", "active", "pilot", "live"].includes(status)
    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
    : ["pending_review", "candidate", "building"].includes(status)
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-red-100 text-red-800 border-red-300";

  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 text-lg font-bold text-slate-900">
        {icon} {title}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function TransparencyPortal({
  snapshot,
  auditChain,
  chainVerification,
}: {
  snapshot: SystemSnapshot;
  auditChain: HashedAuditEvent[];
  chainVerification: ChainVerification;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return snapshot;

    return {
      ...snapshot,
      transactions: snapshot.transactions.filter(
        (t) =>
          t.institution.toLowerCase().includes(q) ||
          t.counterparty.toLowerCase().includes(q) ||
          t.purpose.toLowerCase().includes(q) ||
          t.jurisdiction.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      ),
      impactEntries: snapshot.impactEntries.filter(
        (e) =>
          e.actorName.toLowerCase().includes(q) ||
          e.sector.toLowerCase().includes(q) ||
          e.jurisdiction.toLowerCase().includes(q),
      ),
      jurisdictions: snapshot.jurisdictions.filter(
        (j) =>
          j.name.toLowerCase().includes(q) ||
          j.region.toLowerCase().includes(q) ||
          j.governanceModel.toLowerCase().includes(q),
      ),
    };
  }, [search, snapshot]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          <Globe2 className="mr-2 inline-block h-8 w-8 text-cyan-600" />
          The Architect — Public Transparency Portal
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Read-only public view of government spending, environmental impact, and system integrity.
          <br />
          All data is verifiable through the audit hash chain.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <span>Generated: {new Date(snapshot.generatedAt).toLocaleString()}</span>
          <a
            href={snapshot.platform.sourceRepository}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-600 hover:underline"
          >
            Source Code <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={snapshot.platform.constitutionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-600 hover:underline"
          >
            Constitution <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* KPI bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {[
          { label: "Total Public Spend", value: formatCurrency(snapshot.metrics.publicSpend) },
          { label: "Transactions", value: snapshot.metrics.transactions.toString() },
          { label: "Impact Reports", value: snapshot.metrics.impactEntries.toString() },
          { label: "Jurisdictions", value: `${snapshot.metrics.activeJurisdictions} active / ${snapshot.metrics.jurisdictions} total` },
          { label: "Pending Reviews", value: snapshot.metrics.pendingReviews.toString() },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-extrabold text-slate-900">{kpi.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search transactions, impact reports, jurisdictions..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Audit Chain Integrity */}
      <Section title="Audit Chain Integrity" icon={<ShieldCheck className="h-5 w-5 text-cyan-600" />}>
        <div className="flex items-center gap-4">
          <div
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              chainVerification.valid
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {chainVerification.valid ? "CHAIN VALID" : "CHAIN BROKEN"}
          </div>
          <span className="text-sm text-slate-500">
            {chainVerification.totalEvents} events verified at{" "}
            {new Date(chainVerification.checkedAt).toLocaleString()}
          </span>
        </div>
        {!chainVerification.valid && chainVerification.brokenAt && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>Tamper detected</strong> at event #{chainVerification.brokenAt.index} (
            {chainVerification.brokenAt.eventId}). Hash mismatch: expected{" "}
            <code className="text-xs">{chainVerification.brokenAt.expected.slice(0, 16)}...</code>
          </div>
        )}
        {auditChain.length > 0 && (
          <div className="mt-4 space-y-1">
            <div className="text-xs font-semibold uppercase text-slate-500">Latest chain entries</div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Hash</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Summary</th>
                    <th className="px-3 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditChain.slice(-10).reverse().map((event) => (
                    <tr key={event.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-slate-400">{event.hash.slice(0, 12)}…</td>
                      <td className="px-3 py-2">{event.type}</td>
                      <td className="px-3 py-2 max-w-xs truncate text-slate-700">{event.summary}</td>
                      <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* Public Spending */}
      <Section title="Public Spending Ledger" icon={<Landmark className="h-5 w-5 text-cyan-600" />}>
        {filtered.transactions.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Jurisdiction</th>
                  <th className="px-3 py-2 text-left">Institution</th>
                  <th className="px-3 py-2 text-left">Counterparty</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filtered.transactions.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2">{t.jurisdiction}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{t.institution}</td>
                    <td className="px-3 py-2">{t.counterparty}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(t.amount)}</td>
                    <td className="px-3 py-2">{t.category}</td>
                    <td className="px-3 py-2">{statusBadge(t.status)}</td>
                    <td className="px-3 py-2 text-right font-mono">{t.riskScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Impact Ledger */}
      <Section title="Environmental & Social Impact" icon={<Leaf className="h-5 w-5 text-cyan-600" />}>
        {filtered.impactEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No impact entries match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Actor</th>
                  <th className="px-3 py-2 text-left">Sector</th>
                  <th className="px-3 py-2 text-left">Jurisdiction</th>
                  <th className="px-3 py-2 text-right">CO₂ (t)</th>
                  <th className="px-3 py-2 text-right">Water (m³)</th>
                  <th className="px-3 py-2 text-right">Labor Inc.</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filtered.impactEntries.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-slate-900">{e.actorName}</td>
                    <td className="px-3 py-2">{e.sector}</td>
                    <td className="px-3 py-2">{e.jurisdiction}</td>
                    <td className="px-3 py-2 text-right font-mono">{e.emissionsTonsCo2e.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">{e.waterM3.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">{e.laborIncidents}</td>
                    <td className="px-3 py-2">{statusBadge(e.verificationStatus)}</td>
                    <td className="px-3 py-2 text-right font-mono">{e.riskScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Jurisdictions */}
      <Section title="Registered Jurisdictions" icon={<Building2 className="h-5 w-5 text-cyan-600" />}>
        {filtered.jurisdictions.length === 0 ? (
          <p className="text-sm text-slate-400">No jurisdictions match your search.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.jurisdictions.map((j) => (
              <div key={j.id} className="rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{j.name}</h3>
                    <p className="text-xs text-slate-500">{j.region}</p>
                  </div>
                  {statusBadge(j.status)}
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  <span className="font-medium">Model:</span> {j.governanceModel}
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-medium">Population:</span> {j.population.toLocaleString()}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {j.modules.map((mod) => (
                    <span key={mod} className="rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                      {mod}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Platform Info */}
      <Section title="Platform Status" icon={<BadgeCheck className="h-5 w-5 text-cyan-600" />}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {snapshot.platform.modules.map((m) => (
            <div key={m.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{m.name}</span>
                {statusBadge(m.status)}
              </div>
              <p className="mt-1 text-xs text-slate-500">{m.summary}</p>
              <p className="mt-1 text-[10px] text-slate-400">Owner: {m.owner}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="flex items-center gap-1 text-cyan-600 hover:underline">
            <Link2 className="h-3 w-3" /> Operator Console
          </Link>
          <a href={snapshot.platform.sourceRepository} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-600 hover:underline">
            <ExternalLink className="h-3 w-3" /> GitHub
          </a>
          <a href={snapshot.platform.constitutionUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-600 hover:underline">
            <ExternalLink className="h-3 w-3" /> Constitution
          </a>
        </div>
        <p className="mt-2">The Architect — {snapshot.platform.release} — Built for planetary governance</p>
      </footer>
    </main>
  );
}
