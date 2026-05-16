import { NextRequest } from "next/server";
import { getEnterpriseBySlug } from "@/lib/enterprise/store";
import {
  exportPolicyAsYaml,
  getPolicyPack,
} from "@/lib/enterprise/policy-engine";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const enterprise = getEnterpriseBySlug(slug);
  if (!enterprise) {
    return Response.json({ error: "Enterprise not found" }, { status: 404 });
  }

  const pack = getPolicyPack(
    enterprise.compliancePack === "custom" ? "general" : enterprise.compliancePack,
  );

  const accept = _request.headers.get("accept") ?? "";
  if (accept.includes("text/yaml") || accept.includes("text/x-yaml")) {
    const yaml = exportPolicyAsYaml(pack);
    return new Response(yaml, {
      headers: {
        "Content-Type": "text/yaml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-policy.yaml"`,
      },
    });
  }

  return Response.json(pack);
}
