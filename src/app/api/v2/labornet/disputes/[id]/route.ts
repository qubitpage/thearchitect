/**
 * PATCH /api/v2/labornet/disputes/[id] — Resolve a dispute
 */

import { authorize } from "@/lib/core/rbac";
import * as labornet from "@/lib/modules/labornet";
import { z } from "zod";

const ResolveSchema = z.object({
  resolution: z.string().min(1),
  resolvedBy: z.string().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = ResolveSchema.parse(body);
    const updated = await labornet.resolveDispute(id, parsed.resolution, parsed.resolvedBy);
    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
