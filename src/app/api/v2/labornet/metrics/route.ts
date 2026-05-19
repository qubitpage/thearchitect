/**
 * GET /api/v2/labornet/metrics — LaborNet dashboard metrics
 */

import { authorize } from "@/lib/core/rbac";
import * as labornet from "@/lib/modules/labornet";

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  try {
    const metrics = await labornet.getLaborNetMetrics();
    return Response.json(metrics);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
