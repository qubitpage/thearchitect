/**
 * Authentication and Role-Based Access Control (RBAC) for The Architect.
 *
 * HOW IT WORKS:
 * - Every API request carries a role via the `x-architect-role` header.
 * - In production this would be replaced by JWT/SSID verification.
 * - For the development phase, the header selects one of the defined roles.
 * - Each role has a set of permissions (actions it can perform).
 * - The `authorize()` function checks if the caller's role has the required permission.
 * - If no role header is sent, the request is treated as "citizen" (read-only public access).
 *
 * ROLES (from the Constitution):
 * - citizen:                Read-only access to public data. Every person's default.
 * - operator:               Can submit GovLedger transactions and Impact Ledger entries.
 * - auditor:                Can review/accept/reject/quarantine entries and view audit events.
 * - sector_council:         Can submit impact data and view sector-specific reports.
 * - transparency_authority: Full read access to everything, can export audit bundles.
 * - federation_admin:       Can register jurisdictions and manage platform settings.
 * - system:                 Internal system role for bootstrap and automated actions.
 */

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
  | "admin:platform";

const rolePermissions: Record<Role, Permission[]> = {
  citizen: ["read:public"],
  operator: ["read:public", "write:govledger", "write:impact", "write:inspection"],
  auditor: ["read:public", "read:audit", "write:review", "export:audit"],
  sector_council: ["read:public", "read:audit", "write:impact"],
  transparency_authority: ["read:public", "read:audit", "export:audit", "write:review"],
  federation_admin: [
    "read:public",
    "read:audit",
    "write:govledger",
    "write:impact",
    "write:inspection",
    "write:review",
    "write:jurisdiction",
    "export:audit",
    "admin:platform",
  ],
  system: [
    "read:public",
    "read:audit",
    "write:govledger",
    "write:impact",
    "write:inspection",
    "write:review",
    "write:jurisdiction",
    "export:audit",
    "admin:platform",
  ],
};

const validRoles = new Set<string>(Object.keys(rolePermissions));

export function extractRole(request: Request): Role {
  const header = request.headers.get("x-architect-role");
  if (header && validRoles.has(header)) {
    return header as Role;
  }
  return "citizen";
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function authorize(request: Request, permission: Permission): { ok: true; role: Role } | { ok: false; error: Response } {
  const role = extractRole(request);
  if (hasPermission(role, permission)) {
    return { ok: true, role };
  }
  return {
    ok: false,
    error: Response.json(
      {
        error: "Forbidden",
        message: `Role "${role}" does not have permission "${permission}". Required for this action.`,
        hint: "Set the x-architect-role header to a role with the required permission.",
      },
      { status: 403 },
    ),
  };
}

export function getRolePermissions(role: Role): Permission[] {
  return [...rolePermissions[role]];
}

export function getAllRoles(): { role: Role; permissions: Permission[] }[] {
  return Object.entries(rolePermissions).map(([role, permissions]) => ({
    role: role as Role,
    permissions: [...permissions],
  }));
}
