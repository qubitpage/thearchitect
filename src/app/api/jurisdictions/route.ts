import { authorize } from "@/lib/auth";
import { addJurisdiction, getStore } from "@/lib/store";
import { jurisdictionSchema } from "@/lib/validation";

export async function GET() {
  const { getSystemSnapshot } = await import("@/lib/snapshot");
  return Response.json({ jurisdictions: getSystemSnapshot().jurisdictions });
}

export async function POST(request: Request) {
  const auth = authorize(request, "write:jurisdiction");
  if (!auth.ok) return auth.error;

  const payload = await request.json().catch(() => null);
  const parsed = jurisdictionSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: "Invalid jurisdiction registration", details: parsed.error.flatten() }, { status: 400 });
  }

  const duplicate = getStore().jurisdictions.find(
    (item) => item.name.toLowerCase() === parsed.data.name.toLowerCase() && item.region.toLowerCase() === parsed.data.region.toLowerCase(),
  );

  if (duplicate) {
    return Response.json({ error: "Jurisdiction already registered", jurisdiction: duplicate }, { status: 409 });
  }

  const jurisdiction = addJurisdiction(parsed.data);
  return Response.json({ jurisdiction }, { status: 201 });
}