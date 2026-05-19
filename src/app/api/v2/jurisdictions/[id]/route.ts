/**
 * GET   /api/v2/jurisdictions/[id] — Get jurisdiction details
 * PATCH /api/v2/jurisdictions/[id] — Update jurisdiction status
 */

import { authorize } from "@/lib/core/rbac";
import * as jurisdictions from "@/lib/modules/jurisdictions";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const UpdateStatusSchema = z.object({
  status: z.enum(["candidate", "pilot", "active", "paused", "withdrawn"]),
});

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  try {
    const j = await jurisdictions.getJurisdictionById(id);
    if (!j) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(j);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Params) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;
  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = UpdateStatusSchema.parse(body);
    const j = await jurisdictions.updateJurisdictionStatus(id, parsed.status);
    return Response.json(j);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
