import type { PlatformRoadmap } from "@/lib/types";

export const platformRoadmap: PlatformRoadmap = {
  release: "v2.2.0",
  sourceRepository: "https://github.com/qubitpage/thearchitect",
  latestRelease: "https://github.com/qubitpage/thearchitect/releases/latest",
  constitutionUrl: "/constitution.html",
  modules: [
    {
      id: "govledger",
      name: "GovLedger",
      summary: "Public finance intake, risk scoring, review actions, and audit stream.",
      status: "live",
      owner: "Transparency Authority",
    },
    {
      id: "impact-ledger",
      name: "Impact Ledger",
      summary: "Universal sector reporting for emissions, labor, biodiversity, water, waste, and supply-chain risk.",
      status: "live",
      owner: "Universal Sector Council",
    },
    {
      id: "ai-dpi",
      name: "AI DPI Firewall",
      summary: "Lobster Trap-style deterministic inspection for AI ingress and egress.",
      status: "live",
      owner: "AI Safety Office",
    },
    {
      id: "jurisdiction-registry",
      name: "Jurisdiction Registry",
      summary: "Pilot onboarding, module activation, governance model metadata, and federation readiness.",
      status: "live",
      owner: "Federation Secretariat",
    },
    {
      id: "public-portal",
      name: "Public Transparency Portal",
      summary: "Read-only citizen view for spending, sector impact, public audit events, and release documents.",
      status: "building",
      owner: "Civic Interface Team",
    },
    {
      id: "persistent-ledger",
      name: "Persistent Ledger Storage",
      summary: "PostgreSQL-backed storage, migrations, append-only audit hashes, and export bundles.",
      status: "planned",
      owner: "Infrastructure Team",
    },
  ],
  milestones: [
    {
      id: "m1",
      phase: "Foundation",
      horizon: "Now - 30 days",
      goal: "Stabilize APIs, registry, release metadata, security policy, and pilot onboarding workflows.",
      status: "building",
    },
    {
      id: "m2",
      phase: "Persistence",
      horizon: "30 - 60 days",
      goal: "Move runtime data to PostgreSQL, add migrations, audit hashing, and signed export bundles.",
      status: "planned",
    },
    {
      id: "m3",
      phase: "Public Trust",
      horizon: "60 - 90 days",
      goal: "Launch citizen transparency portal, public search, proof downloads, and issue reporting.",
      status: "planned",
    },
    {
      id: "m4",
      phase: "Federation",
      horizon: "90 - 180 days",
      goal: "Support multiple jurisdictions, roles, delegated reviews, inter-jurisdiction data portability, and policy packs.",
      status: "planned",
    },
  ],
};

export function getPlatformRoadmap() {
  return platformRoadmap;
}

export function getPlatformHealth() {
  return {
    ok: true,
    release: platformRoadmap.release,
    checkedAt: new Date().toISOString(),
    subsystems: [
      { name: "GovLedger API", status: "ok" },
      { name: "Impact Ledger API", status: "ok" },
      { name: "AI DPI API", status: "ok" },
      { name: "Jurisdiction Registry", status: "ok" },
      { name: "Local JSON Store", status: "development" },
    ],
  };
}