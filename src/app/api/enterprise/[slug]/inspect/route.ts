import { NextRequest } from "next/server";
import {
  addEnterpriseInspection,
  getEnterpriseBySlug,
} from "@/lib/enterprise/store";
import { getPolicyPack, inspectWithPolicy } from "@/lib/enterprise/policy-engine";
import { enterpriseInspectionSchema } from "@/lib/enterprise/validation";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const enterprise = getEnterpriseBySlug(slug);
  if (!enterprise) {
    return Response.json({ error: "Enterprise not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = enterpriseInspectionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pack = getPolicyPack(
    enterprise.compliancePack === "custom" ? "general" : enterprise.compliancePack,
  );

  const inspection = inspectWithPolicy(
    parsed.data.content,
    parsed.data.actor,
    parsed.data.direction,
    pack,
    parsed.data.declaredIntent,
    enterprise.id,
  );

  addEnterpriseInspection(inspection);

  return Response.json(inspection, { status: 201 });
}
