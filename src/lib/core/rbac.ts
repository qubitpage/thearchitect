/**
 * RBAC Middleware — role extraction, permission checking, enterprise auth.
 *
 * Two auth modes:
 * 1. Platform RBAC: x-architect-role header → citizen|operator|auditor|...
 * 2. Enterprise API key: x-enterprise-key header → tenant-scoped access
 *
 * In production, mode 1 would be JWT/SSID, mode 2 stays API key.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

// ─── Roles & Permissions (unchanged from v4.0) ─────────────

export type Role =
  | "citizen"
  | "operator"
  | "auditor"
  | "sector_council"
  | "transparency_authority"
  | "federation_admin"
  | "system";

export type Permission =
  | "read:public"
  | "read:audit"
  | "write:govledger"
  | "write:impact"
  | "write:inspection"
  | "write:review"
  | "write:jurisdiction"
  | "export:audit"
  | "admin:platform"
  // Enterprise-specific
  | "enterprise:read"
  | "enterprise:write"
  | "enterprise:admin"
  | "enterprise:agent";

const rolePermissions: Record<Role, Permission[]> = {
  citizen: ["read:public"],
  operator: ["read:public", "write:govledger", "write:impact", "write:inspection"],
  auditor: ["read:public", "read:audit", "write:review", "export:audit"],
  sector_council: ["read:public", "read:audit", "write:impact"],
  transparency_authority: ["read:public", "read:audit", "export:audit", "write:review"],
  federation_admin: [
    "read:public", "read:audit", "write:govledger", "write:impact",
    "write:inspection", "write:review", "write:jurisdiction",
    "export:audit", "admin:platform",
  ],
  system: [
    "read:public", "read:audit", "write:govledger", "write:impact",
    "write:inspection", "write:review", "write:jurisdiction",
    "export:audit", "admin:platform",
  ],
};

const validRoles = new Set<string>(Object.keys(rolePermissions));

// ─── Platform Auth ──────────────────────────────────────────

export function extractRole(request: Request): Role {
  const header = request.headers.get("x-architect-role");
  if (header && validRoles.has(header)) return header as Role;
  return "citizen";
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function authorize(
  request: Request,
  permission: Permission,
): { ok: true; role: Role } | { ok: false; error: Response } {
  const role = extractRole(request);
  if (hasPermission(role, permission)) return { ok: true, role };
  return {
    ok: false,
    error: Response.json(
      {
        error: "Forbidden",
        message: `Role "${role}" lacks permission "${permission}".`,
        hint: "Set x-architect-role header.",
      },
      { status: 403 },
    ),
  };
}

// ─── Enterprise Auth ────────────────────────────────────────

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type EnterpriseAuth = {
  enterprise: typeof schema.enterprises.$inferSelect;
};

export async function authenticateEnterprise(
  request: Request,
): Promise<{ ok: true; enterprise: EnterpriseAuth["enterprise"] } | { ok: false; error: Response }> {
  const apiKey = request.headers.get("x-enterprise-key");
  if (!apiKey) {
    return {
      ok: false,
      error: Response.json({ error: "Missing x-enterprise-key header" }, { status: 401 }),
    };
  }

  const keyHash = await hashKey(apiKey);
  const [enterprise] = await db
    .select()
    .from(schema.enterprises)
    .where(eq(schema.enterprises.apiKeyHash, keyHash))
    .limit(1);

  if (!enterprise || enterprise.status === "deactivated") {
    return {
      ok: false,
      error: Response.json({ error: "Invalid or deactivated API key" }, { status: 401 }),
    };
  }

  if (enterprise.status === "suspended") {
    return {
      ok: false,
      error: Response.json({ error: "Enterprise account suspended" }, { status: 403 }),
    };
  }

  return { ok: true, enterprise };
}

// ─── Dual Auth: Platform role OR Enterprise key ─────────────

export async function authorizeDual(
  request: Request,
  platformPermission: Permission,
): Promise<
  | { ok: true; mode: "platform"; role: Role }
  | { ok: true; mode: "enterprise"; enterprise: EnterpriseAuth["enterprise"] }
  | { ok: false; error: Response }
> {
  // Try enterprise key first
  const apiKey = request.headers.get("x-enterprise-key");
  if (apiKey) {
    const auth = await authenticateEnterprise(request);
    if (auth.ok) return { ok: true, mode: "enterprise", enterprise: auth.enterprise };
    return auth;
  }

  // Fall back to platform role
  const platformAuth = authorize(request, platformPermission);
  if (platformAuth.ok) return { ok: true as const, mode: "platform" as const, role: platformAuth.role };
  return platformAuth;
}

// ─── All roles (for /api/auth/roles) ────────────────────────

export function getAllRoles() {
  return Object.entries(rolePermissions).map(([role, permissions]) => ({
    role,
    permissions,
    description: getRoleDescription(role as Role),
  }));
}

function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    citizen: "Read-only access to public data. Default role for all users.",
    operator: "Can submit GovLedger and Impact Ledger entries.",
    auditor: "Can review, accept, reject entries and export audit data.",
    sector_council: "Can submit impact data and view sector reports.",
    transparency_authority: "Full read access, can export audit bundles.",
    federation_admin: "Can manage jurisdictions and platform settings.",
    system: "Internal system role for automated operations.",
  };
  return descriptions[role];
}
