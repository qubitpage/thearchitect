/**
 * GET  /api/v2/labornet/workers — List worker profiles
 * POST /api/v2/labornet/workers — Register a worker
 */

import { authorize } from "@/lib/core/rbac";
import * as labornet from "@/lib/modules/labornet";
import { z } from "zod";

const RegisterWorkerSchema = z.object({
  identityId: z.string().uuid().optional(),
  displayName: z.string().min(1),
  jurisdictionId: z.string().uuid().optional(),
  skills: z.array(z.object({
    name: z.string().min(1),
    level: z.string().min(1),
  })).default([]),
  hourlyRate: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  availableHoursPerWeek: z.number().positive().optional(),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const jurisdictionId = url.searchParams.get("jurisdictionId") ?? undefined;

  try {
    const workers = await labornet.listWorkers({ jurisdictionId });
    return Response.json({ workers });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = RegisterWorkerSchema.parse(body);
    const worker = await labornet.registerWorker(parsed);
    return Response.json(worker, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
