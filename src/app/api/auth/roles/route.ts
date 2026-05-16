import { getAllRoles } from "@/lib/auth";

export async function GET() {
  return Response.json({ roles: getAllRoles() });
}
