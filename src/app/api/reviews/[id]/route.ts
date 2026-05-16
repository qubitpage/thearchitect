import { authorize } from "@/lib/auth";
import { updateReviewStatus } from "@/lib/store";
import { z } from "zod";

const reviewActionSchema = z.object({
  status: z.enum(["accepted", "pending_review", "quarantined", "rejected"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = authorize(request, "write:review");
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = reviewActionSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: "Invalid review action", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = updateReviewStatus(id, parsed.data.status);

  if (!result) {
    return Response.json({ error: "Review target not found" }, { status: 404 });
  }

  return Response.json(result);
}