import { getDeepHealthCheck } from "@/lib/health";

export async function GET() {
  return Response.json(getDeepHealthCheck());
}