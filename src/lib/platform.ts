import type { PlatformRoadmap } from "@/lib/types";

export const platformRoadmap: PlatformRoadmap = {
  release: "v3.0.0",
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
      status: "live",
      owner: "Civic Interface Team",
    },
    {
      id: "audit-chain",
      name: "Audit Hash Chain",
      summary: "SHA-256 tamper-evident hash chain for all audit events with verification endpoint.",
      status: "live",
      owner: "Infrastructure Team",
    },
    {
      id: "export-bundles",
      name: "Export Proof Bundles",
      summary: "Downloadable JSON packages with full snapshot, hash chain, and bundle integrity hash.",
      status: "live",
      owner: "Transparency Authority",
    },
    {
      id: "rbac",
      name: "Role-Based Access Control",
      summary: "7 roles (citizen to system) with granular permissions on every API endpoint.",
      status: "live",
      owner: "Security Office",
    },
    {
      id: "persistent-ledger",
      name: "Persistent Ledger Storage",
      summary: "PostgreSQL-backed storage with migrations (roadmap — currently JSON file persistence).",
      status: "planned",
      owner: "Infrastructure Team",
    },
  ],
  milestones: [
    {
      id: "m1",
      phase: "Foundation",
      horizon: "Completed",
      goal: "APIs, RBAC, registry, security policy, audit chain, export bundles, and pilot onboarding workflows.",
      status: "live",
    },
    {
      id: "m2",
      phase: "Persistence",
      horizon: "30 - 60 days",
      goal: "Move runtime data to PostgreSQL, add migrations and append-only storage.",
      status: "building",
    },
    {
      id: "m3",
      phase: "Public Trust",
      horizon: "Completed",
      goal: "Citizen transparency portal with search, hash chain verification, and proof downloads.",
      status: "live",
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
  };
}