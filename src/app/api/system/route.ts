import { getSystemSnapshot } from "@/lib/snapshot";

export async function GET() {
  return Response.json(getSystemSnapshot());
}