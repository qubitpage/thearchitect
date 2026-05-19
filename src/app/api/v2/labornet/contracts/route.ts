/**
 * GET  /api/v2/labornet/contracts — List labor contracts
 * POST /api/v2/labornet/contracts — Create a contract
 */

import { authorize } from "@/lib/core/rbac";
import * as labornet from "@/lib/modules/labornet";
import { z } from "zod";

const CreateContractSchema = z.object({
  workerId: z.string().uuid(),
  employerId: z.string().uuid().optional(),
  employerName: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  skills: z.array(z.string()).default([]),
  hourlyRate: z.number().positive(),
  currency: z.string().length(3).optional(),
  hoursPerWeek: z.number().positive().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const workerId = url.searchParams.get("workerId") ?? undefined;
  const employerId = url.searchParams.get("employerId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const contracts = await labornet.listContracts({ workerId, employerId, status });
    return Response.json({ contracts });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateContractSchema.parse(body);
    const contract = await labornet.createContract(parsed);
    return Response.json(contract, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
