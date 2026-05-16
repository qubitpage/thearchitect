import { isBlockingAction } from "@/lib/security-policy";
import { addDpiInspection } from "@/lib/store";
import { dpiInspectionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = dpiInspectionSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: "Invalid inspection request", details: parsed.error.flatten() }, { status: 400 });
  }

  const inspection = addDpiInspection(parsed.data);
  return Response.json(
    { inspection, allowed: !isBlockingAction(inspection.action) },
    { status: isBlockingAction(inspection.action) ? 202 : 200 },
  );
}