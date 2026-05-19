/**
 * PATCH /api/v2/labornet/contracts/[id] — Activate or complete a contract
 * GET   /api/v2/labornet/contracts/[id] — Get contract by ID
 */

import { authorize } from "@/lib/core/rbac";
import * as labornet from "@/lib/modules/labornet";
import { z } from "zod";

const UpdateSchema = z.object({
  action: z.enum(["activate", "complete"]),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const { id } = await params;

  try {
    const contract = await labornet.getContractById(id);
    if (!contract) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(contract);
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
    const parsed = UpdateSchema.parse(body);

    let updated;
    if (parsed.action === "activate") {
      updated = await labornet.activateContract(id);
    } else {
      updated = await labornet.completeContract(id);
    }

    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
