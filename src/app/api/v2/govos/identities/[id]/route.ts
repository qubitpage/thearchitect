/**
 * PATCH /api/v2/govos/identities/[id] — Verify an identity
 * GET   /api/v2/govos/identities/[id] — Get identity by ID
 */

import { authorize } from "@/lib/core/rbac";
import * as govos from "@/lib/modules/govos";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const { id } = await params;

  try {
    const identity = await govos.getIdentityById(id);
    if (!identity) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(identity);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const verifiedBy = body.verifiedBy ?? "system";
    const updated = await govos.verifyIdentity(id, verifiedBy);
    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(updated);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
