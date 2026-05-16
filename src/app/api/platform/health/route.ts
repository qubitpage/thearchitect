import { getPlatformHealth } from "@/lib/platform";

export async function GET() {
  return Response.json(getPlatformHealth());
}