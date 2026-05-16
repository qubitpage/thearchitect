"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  ChevronRight,
  Loader2,
  Radar,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

type DemoPhase = "landing" | "onboarding" | "dashboard";

export default function DemoPage() {
  const [phase, setPhase] = useState<DemoPhase>("landing");
  const [slug, setSlug] = useState("");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {phase === "landing" && <Landing onStart={() => setPhase("onboarding")} />}
      {phase === "onboarding" && (
        <Onboarding
          onDone={(s) => {
            setSlug(s);
            setPhase("dashboard");
          }}
        />
      )}
      {phase === "dashboard" && <DashboardRedirect slug={slug} />}
    </div>
  );
}

// ─── Landing ────────────────────────────────────────────────

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Hero */}
      <div className="text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-900/30 px-4 py-1 text-sm text-indigo-400">
          <Sparkles className="h-4 w-4" /> Hackathon Demo
        </div>
        <h1 className="text-5xl font-bold leading-tight">
          The Architect
          <span className="block text-indigo-400">Enterprise Governance Platform</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-zinc-400">
          AI-powered governance for the enterprise. Deep Prompt Inspection with Veea Lobster Trap,
          intelligent analysis with Google Gemini, tamper-evident audit chains, and multi-tenant
          compliance — all in one platform.
        </p>
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-lg font-bold hover:bg-indigo-500 transition"
        >
          Try Live Demo <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Architecture */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <ArchCard
            icon={Radar}
            color="text-cyan-400"
            title="1. Deep Prompt Inspection"
            description="Every agent interaction passes through Lobster Trap DPI. Content is inspected for prompt injection, credential leaks, PII exposure, data exfiltration, and compliance-specific threats. P4-style first-match-wins evaluation."
          />
          <ArchCard
            icon={Bot}
            color="text-violet-400"
            title="2. AI Governance Agent"
            description="Google Gemini analyzes governance data — spending patterns, compliance posture, risk factors, anomalies. Structured findings with severity ratings, evidence, and remediation steps."
          />
          <ArchCard
            icon={ShieldCheck}
            color="text-emerald-400"
            title="3. Audit & Compliance"
            description="SHA-256 tamper-evident hash chain records every event. Role-based access control with 7 roles. Export proof bundles for regulators. Compliance packs for HIPAA, SOC2, Finance."
          />
        </div>
      </section>

      {/* Value Props */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Enterprise Value</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ValueCard
            icon={Shield}
            value="18 Rules"
            label="DPI policy rules across 4 compliance packs"
          />
          <ValueCard
            icon={AlertTriangle}
            value="6 Actions"
            label="ALLOW → LOG → RATE_LIMIT → HUMAN_REVIEW → QUARANTINE → DENY"
          />
          <ValueCard
            icon={Bot}
            value="6 AI Tasks"
            label="Spending, compliance, risk, document, anomaly, policy analysis"
          />
          <ValueCard
            icon={Building2}
            value="4 Tiers"
            label="Pilot → Starter → Professional → Enterprise"
          />
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Built With</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            "Next.js 16", "React 19", "TypeScript", "Tailwind CSS",
            "Veea Lobster Trap", "Google Gemini", "SHA-256 Audit Chain",
            "Zod Validation", "RBAC (7 roles)", "GitHub Actions CI",
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Tracks */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8">Hackathon Tracks</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-cyan-800/50 bg-cyan-900/10 p-6">
            <h3 className="text-lg font-bold text-cyan-400 mb-2">Track 1: Agent Security (Veea)</h3>
            <ul className="space-y-1 text-sm text-zinc-300">
              <li>✓ Lobster Trap-compatible DPI with YAML export</li>
              <li>✓ Bidirectional inspection (ingress + egress)</li>
              <li>✓ Intent mismatch detection and escalation</li>
              <li>✓ 4 compliance-specific policy packs</li>
              <li>✓ PII, credential, and exfiltration detection</li>
              <li>✓ Tamper-evident audit hash chain</li>
            </ul>
          </div>
          <div className="rounded-xl border border-violet-800/50 bg-violet-900/10 p-6">
            <h3 className="text-lg font-bold text-violet-400 mb-2">Track 2: AI Agents (Google)</h3>
            <ul className="space-y-1 text-sm text-zinc-300">
              <li>✓ Gemini-powered governance agent (6 task types)</li>
              <li>✓ Structured findings with evidence + remediation</li>
              <li>✓ Risk scoring and confidence metrics</li>
              <li>✓ Compliance-aware analysis</li>
              <li>✓ DPI inspection of agent I/O (both directions)</li>
              <li>✓ Demo mode with deterministic results for showcase</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function ArchCard({ icon: Icon, color, title, description }: { icon: typeof Activity; color: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
      <Icon className={`h-8 w-8 ${color}`} />
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  );
}

function ValueCard({ icon: Icon, value, label }: { icon: typeof Activity; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
      <Icon className="mx-auto h-6 w-6 text-indigo-400 mb-2" />
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-zinc-400 mt-1">{label}</div>
    </div>
  );
}

// ─── Onboarding ─────────────────────────────────────────────

function Onboarding({ onDone }: { onDone: (slug: string) => void }) {
  const [name, setName] = useState("Acme Healthcare");
  const [domain, setDomain] = useState("acme-health.io");
  const [email, setEmail] = useState("admin@acme-health.io");
  const [industry, setIndustry] = useState("Healthcare");
  const [compliance, setCompliance] = useState("hipaa");
  const [tier, setTier] = useState("professional");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/enterprise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-architect-role": "federation_admin",
        },
        body: JSON.stringify({
          name,
          domain,
          contactEmail: email,
          industry,
          compliancePack: compliance,
          tier,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
        return;
      }
      setApiKey(data.apiKey);
      // Wait for user to see the key
      setTimeout(() => onDone(data.enterprise.slug), 3000);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  if (apiKey) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center space-y-6">
        <ShieldCheck className="mx-auto h-16 w-16 text-emerald-400" />
        <h2 className="text-2xl font-bold">Enterprise Registered!</h2>
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-2">Your API Key (save this — shown once):</p>
          <code className="block rounded-lg bg-zinc-800 p-3 text-sm font-mono text-emerald-400 break-all select-all">
            {apiKey}
          </code>
        </div>
        <p className="text-sm text-zinc-400">Redirecting to your dashboard...</p>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="text-center mb-8">
        <Building2 className="mx-auto h-12 w-12 text-indigo-400 mb-4" />
        <h2 className="text-2xl font-bold">Register Your Enterprise</h2>
        <p className="text-sm text-zinc-400 mt-2">
          Create a tenant in 30 seconds. For the demo, we pre-fill a healthcare organization.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Organization Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Domain</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Industry</label>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Contact Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Compliance Pack</label>
            <select value={compliance} onChange={(e) => setCompliance(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">
              <option value="general">General</option>
              <option value="hipaa">HIPAA (Healthcare)</option>
              <option value="soc2">SOC 2 (Technology)</option>
              <option value="finance">Finance (Banking)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Tier</label>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">
              <option value="pilot">Pilot (50 tasks)</option>
              <option value="starter">Starter (200 tasks)</option>
              <option value="professional">Professional (1,000 tasks)</option>
              <option value="enterprise">Enterprise (10,000 tasks)</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-800 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Register Enterprise
        </button>
      </form>
    </div>
  );
}

// ─── Dashboard Redirect ─────────────────────────────────────

function DashboardRedirect({ slug }: { slug: string }) {
  useEffect(() => {
    window.location.href = `/enterprise/${slug}`;
  }, [slug]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
    </div>
  );
}
