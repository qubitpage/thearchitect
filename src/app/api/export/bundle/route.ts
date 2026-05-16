import { authorize, extractRole } from "@/lib/auth";
import { generateExportBundle } from "@/lib/export-bundle";

export async function GET(request: Request) {
  const auth = authorize(request, "export:audit");
  if (!auth.ok) return auth.error;

  const role = extractRole(request);
  const bundle = await generateExportBundle(role);

  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="architect-export-${bundle.bundleId}.json"`,
      "X-Bundle-Hash": bundle.bundleHash,
    },
  });
}
