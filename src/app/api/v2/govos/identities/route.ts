/**
 * GET  /api/v2/govos/identities — List digital identities
 * POST /api/v2/govos/identities — Register a new identity
 */

import { authorize } from "@/lib/core/rbac";
import * as govos from "@/lib/modules/govos";
import { z } from "zod";

const RegisterIdentitySchema = z.object({
  jurisdictionId: z.string().uuid().optional(),
  displayName: z.string().min(1),
  identifier: z.string().min(1),
  identityType: z.enum(["citizen", "business", "organization"]),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const jurisdictionId = url.searchParams.get("jurisdictionId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;

  try {
    const identities = await govos.listIdentities({ jurisdictionId, status, type });
    return Response.json({ identities });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = RegisterIdentitySchema.parse(body);
    const identity = await govos.registerIdentity(parsed);
    return Response.json(identity, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
