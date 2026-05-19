/**
 * GET  /api/v2/govledger/transactions — List transactions (filterable)
 * POST /api/v2/govledger/transactions — Create transaction
 */

import { authorize } from "@/lib/core/rbac";
import * as govledger from "@/lib/modules/govledger";
import { z } from "zod";

const CreateTransactionSchema = z.object({
  jurisdiction: z.string().min(1),
  jurisdictionId: z.string().uuid().optional(),
  institution: z.string().min(1),
  counterparty: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().max(8).default("EUR"),
  category: z.string().min(1),
  purpose: z.string().min(10),
  classification: z.enum(["public", "pseudonymized", "classified"]).default("public"),
});

export async function GET(request: Request) {
  const auth = authorize(request, "read:public");
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  try {
    const transactions = await govledger.listTransactions({ status, category, limit, offset });
    const metrics = await govledger.getGovLedgerMetrics();
    return Response.json({ transactions, metrics });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request, "write:govledger");
  if (!auth.ok) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateTransactionSchema.parse(body);
    const tx = await govledger.createTransaction(parsed);
    return Response.json(tx, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
