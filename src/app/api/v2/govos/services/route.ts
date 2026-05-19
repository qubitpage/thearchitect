/**
 * GET  /api/v2/govos/services — List government services
 * POST /api/v2/govos/services — Create a government service
 */

import { authorize } from "@/lib/core/rbac";
import * as govos from "@/lib/modules/govos";
import { z } from "zod";

const CreateServiceSchema = z.object({
  jurisdictionId: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  requiredDocuments: z.array(z.string()).default([]),
  estimatedDays: z.number().positive().optional(),
  fee: z.number().nonnegative().optional(),
  feeCurrency: z.string().length(3).optional(),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const jurisdictionId = url.searchParams.get("jurisdictionId") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;

  try {
    const services = await govos.listServices({ jurisdictionId, category });
    return Response.json({ services });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateServiceSchema.parse(body);
    const service = await govos.createService(parsed);
    return Response.json(service, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
