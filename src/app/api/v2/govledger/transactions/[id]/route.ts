/**
 * GET   /api/v2/govledger/transactions/[id] — Get transaction by ID
 * PATCH /api/v2/govledger/transactions/[id] — Review transaction (accept/reject/quarantine)
 */

import { authorize } from "@/lib/core/rbac";
import * as govledger from "@/lib/modules/govledger";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const ReviewSchema = z.object({
  status: z.enum(["accepted", "rejected", "quarantined"]),
  reviewer: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  try {
    const tx = await govledger.getTransactionById(id);
    if (!tx) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(tx);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Params) {
  const auth = authorize(request, "write:review");
  if (!auth.ok) return auth.error;
  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = ReviewSchema.parse(body);
    const tx = await govledger.reviewTransaction(id, parsed.status, parsed.reviewer);
    return Response.json(tx);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
