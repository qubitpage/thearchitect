/**
 * PATCH /api/v2/govos/requests/[id] — Process a service request (approve/reject/complete)
 */

import { authorize } from "@/lib/core/rbac";
import * as govos from "@/lib/modules/govos";
import { z } from "zod";

const ProcessSchema = z.object({
  action: z.enum(["approved", "rejected", "completed"]),
  processedBy: z.string().min(1),
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
    const parsed = ProcessSchema.parse(body);
    const updated = await govos.processServiceRequest(id, parsed.action, parsed.processedBy);
    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
