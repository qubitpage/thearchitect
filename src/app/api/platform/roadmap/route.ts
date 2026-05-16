import { getPlatformRoadmap } from "@/lib/platform";

export async function GET() {
  return Response.json(getPlatformRoadmap());
}