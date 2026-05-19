/**
 * GET /api/v2/govos/metrics — GovOS dashboard metrics
 */

import { authorize } from "@/lib/core/rbac";
import * as govos from "@/lib/modules/govos";

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const jurisdictionId = url.searchParams.get("jurisdictionId") ?? undefined;

  try {
    const metrics = await govos.getGovOSMetrics(jurisdictionId);
    return Response.json(metrics);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
