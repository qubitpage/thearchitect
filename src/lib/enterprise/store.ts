/**
 * Enterprise Store — Multi-Tenant Data Management
 *
 * Each enterprise gets isolated storage for:
 * - DPI inspections with Lobster Trap metadata
 * - Agent tasks and results
 * - Tenant-specific audit events
 *
 * API key authentication:
 * - Keys are SHA-256 hashed before storage (never store plaintext)
 * - Lookup by hash for O(1) authentication
 * - Keys are generated as crypto-random hex strings
 */

import { createId, nowIso } from "@/lib/ids";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import type {
  AgentTask,
  CompliancePack,
  Enterprise,
  EnterpriseDpiInspection,
  EnterpriseTier,
} from "@/lib/enterprise/types";

type EnterpriseStore = {
  enterprises: Enterprise[];
  inspections: EnterpriseDpiInspection[];
  agentTasks: AgentTask[];
};

type GlobalEnterpriseStore = typeof globalThis & {
  __enterpriseStore?: EnterpriseStore;
};

const storePath = join(cwd(), ".data", "enterprise-store.json");

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateApiKey(): string {
  return `ark_${crypto.randomUUID().replace(/-/g, "")}`;
}

function createSeedStore(): EnterpriseStore {
  return {
    enterprises: [],
    inspections: [],
    agentTasks: [],
  };
}

function loadStore(): EnterpriseStore {
  if (!existsSync(storePath)) return createSeedStore();
  try {
    const raw = JSON.parse(readFileSync(storePath, "utf8")) as EnterpriseStore;
    raw.enterprises ??= [];
    raw.inspections ??= [];
    raw.agentTasks ??= [];
    return raw;
  } catch {
    return createSeedStore();
  }
}

function saveStore() {
  const store = getEnterpriseStore();
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(storePath, JSON.stringify(store, null, 2));
}

export function getEnterpriseStore(): EnterpriseStore {
  const global = globalThis as GlobalEnterpriseStore;
  global.__enterpriseStore ??= loadStore();
  return global.__enterpriseStore;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

// ─── Enterprise CRUD ────────────────────────────────────────

export async function registerEnterprise(input: {
  name: string;
  domain: string;
  contactEmail: string;
  industry: string;
  compliancePack: CompliancePack;
  tier: EnterpriseTier;
}): Promise<{ enterprise: Enterprise; apiKey: string }> {
  const store = getEnterpriseStore();

  const duplicate = store.enterprises.find(
    (e) => e.domain.toLowerCase() === input.domain.toLowerCase(),
  );
  if (duplicate) throw new Error(`Enterprise with domain ${input.domain} already registered`);

  const apiKey = generateApiKey();
  const apiKeyHash = await hashKey(apiKey);

  const enterprise: Enterprise = {
    id: createId("ent"),
    name: input.name,
    slug: slugify(input.name),
    domain: input.domain,
    tier: input.tier,
    status: input.tier === "pilot" ? "trial" : "active",
    compliancePack: input.compliancePack,
    apiKeyHash,
    contactEmail: input.contactEmail,
    industry: input.industry,
    agentQuota: input.tier === "pilot" ? 50 : input.tier === "starter" ? 200 : input.tier === "professional" ? 1000 : 10000,
    agentsUsed: 0,
    createdAt: nowIso(),
  };

  store.enterprises.unshift(enterprise);
  saveStore();

  return { enterprise, apiKey };
}

export async function authenticateEnterprise(apiKey: string): Promise<Enterprise | null> {
  const keyHash = await hashKey(apiKey);
  const store = getEnterpriseStore();
  return store.enterprises.find((e) => e.apiKeyHash === keyHash && e.status !== "deactivated") ?? null;
}

export function getEnterpriseBySlug(slug: string): Enterprise | null {
  return getEnterpriseStore().enterprises.find((e) => e.slug === slug) ?? null;
}

export function getEnterpriseById(id: string): Enterprise | null {
  return getEnterpriseStore().enterprises.find((e) => e.id === id) ?? null;
}

export function listEnterprises(): Enterprise[] {
  return getEnterpriseStore().enterprises.map((e) => ({
    ...e,
    apiKeyHash: "[REDACTED]",
  }));
}

// ─── Enterprise Inspections ─────────────────────────────────

export function addEnterpriseInspection(inspection: EnterpriseDpiInspection) {
  getEnterpriseStore().inspections.unshift(inspection);
  saveStore();
}

export function getEnterpriseInspections(enterpriseId: string, limit = 50): EnterpriseDpiInspection[] {
  return getEnterpriseStore()
    .inspections.filter((i) => i.enterpriseId === enterpriseId)
    .slice(0, limit);
}

// ─── Agent Tasks ────────────────────────────────────────────

export function addAgentTask(task: AgentTask) {
  getEnterpriseStore().agentTasks.unshift(task);
  saveStore();
}

export function updateAgentTask(taskId: string, update: Partial<AgentTask>) {
  const store = getEnterpriseStore();
  const task = store.agentTasks.find((t) => t.id === taskId);
  if (task) {
    Object.assign(task, update);
    saveStore();
  }
  return task;
}

export function getEnterpriseTasks(enterpriseId: string, limit = 20): AgentTask[] {
  return getEnterpriseStore()
    .agentTasks.filter((t) => t.enterpriseId === enterpriseId)
    .slice(0, limit);
}

// ─── Enterprise Metrics ─────────────────────────────────────

export function getEnterpriseMetrics(enterpriseId: string) {
  const inspections = getEnterpriseStore().inspections.filter((i) => i.enterpriseId === enterpriseId);
  const tasks = getEnterpriseStore().agentTasks.filter((t) => t.enterpriseId === enterpriseId);

  const blocked = inspections.filter((i) => i.action === "DENY" || i.action === "QUARANTINE").length;
  const allowed = inspections.filter((i) => i.action === "ALLOW" || i.action === "LOG").length;
  const humanReview = inspections.filter((i) => i.action === "HUMAN_REVIEW").length;
  const piiBlocked = inspections.filter((i) => i.lobsterTrapMeta.piiDetected && i.action !== "ALLOW").length;
  const exfiltration = inspections.filter((i) => i.lobsterTrapMeta.exfiltrationRisk).length;
  const avgRisk = inspections.length
    ? Math.round(inspections.reduce((s, i) => s + i.riskScore, 0) / inspections.length)
    : 0;

  // Compliance score: 100 minus penalties for blocked threats
  const complianceScore = Math.max(0, Math.min(100, 100 - Math.round((blocked / Math.max(inspections.length, 1)) * 100)));

  // Top threats by rule name
  const threatCounts = new Map<string, { count: number; lastSeen: string }>();
  for (const insp of inspections) {
    for (const rule of insp.matchedRules) {
      const existing = threatCounts.get(rule);
      if (!existing || insp.createdAt > existing.lastSeen) {
        threatCounts.set(rule, {
          count: (existing?.count ?? 0) + 1,
          lastSeen: insp.createdAt,
        });
      }
    }
  }
  const topThreats = [...threatCounts.entries()]
    .map(([rule, data]) => ({ rule, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalInspections: inspections.length,
    blockedThreats: blocked,
    allowedRequests: allowed,
    humanReviewPending: humanReview,
    complianceScore,
    agentTasksCompleted: tasks.filter((t) => t.status === "completed").length,
    averageRiskScore: avgRisk,
    piiExposuresBlocked: piiBlocked,
    exfiltrationAttempts: exfiltration,
    topThreats,
  };
}
