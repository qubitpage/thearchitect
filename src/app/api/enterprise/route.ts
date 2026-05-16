import { NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import {
  listEnterprises,
  registerEnterprise,
} from "@/lib/enterprise/store";
import { enterpriseRegistrationSchema } from "@/lib/enterprise/validation";

export async function GET() {
  return Response.json({ enterprises: listEnterprises() });
}

export async function POST(request: NextRequest) {
  const auth = authorize(request, "admin:platform");
  if (!auth.ok) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = enterpriseRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { enterprise, apiKey } = await registerEnterprise(parsed.data);
    return Response.json({ enterprise, apiKey }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already registered")) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
