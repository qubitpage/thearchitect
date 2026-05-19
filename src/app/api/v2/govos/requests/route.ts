/**
 * GET  /api/v2/govos/requests — List service requests
 * POST /api/v2/govos/requests — Submit a service request
 */

import { authorize } from "@/lib/core/rbac";
import * as govos from "@/lib/modules/govos";
import { z } from "zod";

const SubmitRequestSchema = z.object({
  serviceId: z.string().uuid(),
  identityId: z.string().uuid(),
  submittedDocuments: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const serviceId = url.searchParams.get("serviceId") ?? undefined;
  const identityId = url.searchParams.get("identityId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const requests = await govos.listServiceRequests({ serviceId, identityId, status });
    return Response.json({ requests });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = SubmitRequestSchema.parse(body);
    const req = await govos.submitServiceRequest(parsed);
    return Response.json(req, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
