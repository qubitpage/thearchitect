/**
 * GET  /api/v2/labornet/disputes — List labor disputes
 * POST /api/v2/labornet/disputes — File a dispute
 */

import { authorize } from "@/lib/core/rbac";
import * as labornet from "@/lib/modules/labornet";
import { z } from "zod";

const FileDisputeSchema = z.object({
  contractId: z.string().uuid(),
  filedBy: z.enum(["worker", "employer"]),
  reason: z.string().min(1),
  description: z.string().min(1),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const contractId = url.searchParams.get("contractId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const disputes = await labornet.listDisputes({ contractId, status });
    return Response.json({ disputes });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = FileDisputeSchema.parse(body);
    const dispute = await labornet.fileDispute(parsed);
    return Response.json(dispute, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
