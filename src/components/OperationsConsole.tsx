"use client";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  FileText,
  Gavel,
  Globe2,
  Landmark,
  Leaf,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import type { SystemSnapshot } from "@/lib/types";

type ApiState = "idle" | "saving" | "error" | "saved";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusTone(status: string) {
  if (status === "accepted" || status === "ALLOW" || status === "LOG") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "pending_review" || status === "HUMAN_REVIEW" || status === "RATE_LIMIT") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  min,
  max,
}: {
  label: string;
  name: string;
  defaultValue: string | number;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
      {label}
      <input
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        name={name}
        type={type}
        min={min}
        max={max}
        defaultValue={defaultValue}
        required
      />
    </label>
  );
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 md:col-span-2">
      {label}
      <textarea
        className="min-h-24 resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        name={name}
        defaultValue={defaultValue}
        required
      />
    </label>
  );
}

export function OperationsConsole({ initialSnapshot }: { initialSnapshot: SystemSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [apiState, setApiState] = useState<ApiState>("idle");
  const [message, setMessage] = useState("System ready");

  const latestRisk = useMemo(() => {
    const risk = Math.max(
      ...snapshot.transactions.map((item) => item.riskScore),
      ...snapshot.impactEntries.map((item) => item.riskScore),
      ...snapshot.inspections.map((item) => item.riskScore),
      0,
    );
    return risk;
  }, [snapshot]);

  async function refreshSnapshot() {
    const response = await fetch("/api/system", { cache: "no-store" });
    if (!response.ok) throw new Error("Snapshot refresh failed");
    setSnapshot((await response.json()) as SystemSnapshot);
  }

  async function postForm(event: FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault();
    setApiState("saving");
    setMessage("Submitting to The Architect control plane");

    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Request rejected");
      }

      await refreshSnapshot();
      setApiState("saved");
      setMessage("Accepted into the audit stream");
    } catch (error) {
      setApiState("error");
      setMessage(error instanceof Error ? error.message : "Request failed");
    }
  }

  async function reviewItem(id: string, status: "accepted" | "pending_review" | "quarantined" | "rejected") {
    setApiState("saving");
    setMessage(`Setting ${id} to ${status}`);

    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Review action failed");
      }

      await refreshSnapshot();
      setApiState("saved");
      setMessage(`Review action saved: ${status}`);
    } catch (error) {
      setApiState("error");
      setMessage(error instanceof Error ? error.message : "Review action failed");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="grid content-center gap-5">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1">
                <Globe2 size={14} /> The Architect v0.1
              </span>
              <span>Founding jurisdiction console</span>
            </div>
            <div className="grid gap-3">
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                Governance ledger, impact ledger, and AI firewall in one control plane.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                First runnable slice for transparent public spending, universal sector accountability, Lobster Trap-style DPI, and audit events.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                className="inline-flex h-11 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                href="/api/system"
              >
                <Activity size={16} /> API Snapshot
              </a>
              <a
                className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-cyan-300 hover:text-cyan-800"
                href="/THE_ARCHITECT_PITCH_DECK.pdf"
              >
                <FileText size={16} /> Pitch Deck
              </a>
            </div>
          </div>
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Live status</p>
                <p className="mt-1 text-sm text-slate-300">{message}</p>
              </div>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-bold text-white transition hover:bg-white/10"
                onClick={() => refreshSnapshot()}
                type="button"
              >
                <RefreshCcw size={15} /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Spend" value={formatCurrency(snapshot.metrics.publicSpend)} />
              <Metric label="Reviews" value={String(snapshot.metrics.pendingReviews)} />
              <Metric label="DPI" value={String(snapshot.metrics.inspections)} />
              <Metric label="Risk" value={`${latestRisk}/100`} />
            </div>
            <div className={`rounded-md border px-3 py-2 text-sm font-semibold ${apiState === "error" ? "border-red-400 bg-red-950/40 text-red-100" : "border-white/10 bg-white/5 text-slate-200"}`}>
              {apiState === "saving" ? "Writing audit record..." : message}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-6 lg:grid-cols-4 lg:px-8">
        <Kpi icon={<Landmark size={18} />} label="GovLedger transactions" value={snapshot.metrics.transactions} />
        <Kpi icon={<Leaf size={18} />} label="Impact entries" value={snapshot.metrics.impactEntries} />
        <Kpi icon={<ShieldCheck size={18} />} label="Quarantined items" value={snapshot.metrics.quarantinedItems} />
        <Kpi icon={<Gavel size={18} />} label="Average impact risk" value={`${snapshot.metrics.averageImpactRisk}/100`} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-8 lg:grid-cols-3 lg:px-8">
        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(event) => postForm(event, "/api/govledger/transactions")}>
          <PanelHeader icon={<Landmark size={18} />} eyebrow="GovLedger" title="Transaction intake" />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Jurisdiction" name="jurisdiction" defaultValue="Founding City Pilot" />
            <Field label="Institution" name="institution" defaultValue="Public Works Authority" />
            <Field label="Counterparty" name="counterparty" defaultValue="Civic Infrastructure Labs" />
            <Field label="Amount" name="amount" type="number" defaultValue={1250000} min={1} />
            <Field label="Currency" name="currency" defaultValue="EUR" />
            <Field label="Category" name="category" defaultValue="infrastructure" />
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Classification
              <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="classification" defaultValue="public">
                <option value="public">Public</option>
                <option value="pseudonymized">Pseudonymized</option>
                <option value="classified">Classified</option>
              </select>
            </label>
            <TextArea label="Purpose" name="purpose" defaultValue="Bridge repair procurement with public tender, milestone escrow, and delivery verification." />
          </div>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700" type="submit">
            <BadgeCheck size={16} /> Record transaction
          </button>
        </form>

        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(event) => postForm(event, "/api/impact-ledger/entries")}>
          <PanelHeader icon={<Leaf size={18} />} eyebrow="Universal Sector" title="Impact intake" />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Actor" name="actorName" defaultValue="Civic Materials Group" />
            <Field label="Sector" name="sector" defaultValue="construction" />
            <Field label="Jurisdiction" name="jurisdiction" defaultValue="Founding City Pilot" />
            <Field label="Period" name="reportingPeriod" defaultValue="2026-Q2" />
            <Field label="CO2e tons" name="emissionsTonsCo2e" type="number" defaultValue={54000} min={0} />
            <Field label="Water m3" name="waterM3" type="number" defaultValue={220000} min={0} />
            <Field label="Waste kg" name="wasteKg" type="number" defaultValue={18000} min={0} />
            <Field label="Labor incidents" name="laborIncidents" type="number" defaultValue={0} min={0} />
            <Field label="Animal welfare" name="animalWelfareScore" type="number" defaultValue={100} min={0} max={100} />
            <Field label="Biodiversity" name="biodiversityImpact" type="number" defaultValue={8} min={-100} max={100} />
            <Field label="Supply risk" name="supplyChainRisk" type="number" defaultValue={42} min={0} max={100} />
          </div>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700" type="submit">
            <Sparkles size={16} /> Record impact
          </button>
        </form>

        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(event) => postForm(event, "/api/security/inspect")}>
          <PanelHeader icon={<ShieldCheck size={18} />} eyebrow="AI Firewall" title="DPI inspection" />
          <div className="grid gap-3">
            <Field label="Actor" name="actor" defaultValue="governance-agent" />
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Direction
              <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="direction" defaultValue="ingress">
                <option value="ingress">Ingress</option>
                <option value="egress">Egress</option>
              </select>
            </label>
            <TextArea label="Content" name="content" defaultValue="Review the procurement file and flag risks without exposing private citizen data." />
          </div>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800" type="submit">
            <ShieldCheck size={16} /> Inspect content
          </button>
        </form>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <DataPanel title="GovLedger stream" rows={snapshot.transactions.map((item) => ({
          id: item.id,
          title: item.institution,
          detail: `${item.counterparty} - ${item.currency} ${item.amount.toLocaleString()} - ${item.category}`,
          status: item.status,
          risk: item.riskScore,
          flags: item.flags,
        }))} onReview={reviewItem} />
        <DataPanel title="Impact Ledger stream" rows={snapshot.impactEntries.map((item) => ({
          id: item.id,
          title: item.actorName,
          detail: `${item.sector} - ${item.reportingPeriod} - ${item.emissionsTonsCo2e.toLocaleString()} CO2e tons`,
          status: item.verificationStatus,
          risk: item.riskScore,
          flags: item.flags,
        }))} onReview={reviewItem} />
        <DataPanel title="DPI stream" rows={snapshot.inspections.map((item) => ({
          id: item.id,
          title: `${item.actor} - ${item.direction}`,
          detail: item.redactedPreview,
          status: item.action,
          risk: item.riskScore,
          flags: item.matchedRules,
        }))} />
        <DataPanel title="Audit stream" rows={snapshot.auditEvents.map((item) => ({
          id: item.id,
          title: item.type,
          detail: item.summary,
          status: item.severity,
          risk: item.severity === "critical" ? 100 : item.severity === "warning" ? 45 : 0,
          flags: item.referenceId ? [item.referenceId] : [],
        }))} />
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      </div>
      <div className="grid size-10 place-items-center rounded-md bg-cyan-50 text-cyan-700">{icon}</div>
    </div>
  );
}

function PanelHeader({ icon, eyebrow, title }: { icon: ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
      <div className="grid size-10 place-items-center rounded-md bg-slate-950 text-white">{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">{eyebrow}</p>
        <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
      </div>
    </div>
  );
}

function DataPanel({
  title,
  rows,
  onReview,
}: {
  title: string;
  rows: { id: string; title: string; detail: string; status: string; risk: number; flags: string[] }[];
  onReview?: (id: string, status: "accepted" | "pending_review" | "quarantined" | "rejected") => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{rows.length} rows</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <article className="grid gap-2 px-5 py-4" key={row.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">{row.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{row.detail}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-[0.09em] ${statusTone(row.status)}`}>{row.status}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                <AlertTriangle size={13} /> Risk {row.risk}/100
              </span>
              {row.flags.length === 0 ? <span>No flags</span> : row.flags.map((flag) => <span key={flag}>{flag}</span>)}
            </div>
            {onReview ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  className="h-8 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-black uppercase tracking-[0.08em] text-emerald-700 transition hover:bg-emerald-100"
                  onClick={() => onReview(row.id, "accepted")}
                  type="button"
                >
                  Accept
                </button>
                <button
                  className="h-8 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-black uppercase tracking-[0.08em] text-amber-700 transition hover:bg-amber-100"
                  onClick={() => onReview(row.id, "pending_review")}
                  type="button"
                >
                  Review
                </button>
                <button
                  className="h-8 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-black uppercase tracking-[0.08em] text-red-700 transition hover:bg-red-100"
                  onClick={() => onReview(row.id, "quarantined")}
                  type="button"
                >
                  Quarantine
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}