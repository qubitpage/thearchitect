/**
 * POST /api/v2/enterprise/[slug]/corpledger — Create corporate transaction
 * GET  /api/v2/enterprise/[slug]/corpledger — List corporate transactions
 */

import { authenticateEnterprise } from "@/lib/core/rbac";
import * as enterprise from "@/lib/modules/enterprise";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const CreateCorpTxSchema = z.object({
  department: z.string().min(1),
  counterparty: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().max(8).default("USD"),
  category: z.string().min(1),
  purpose: z.string().min(10),
});

export async function GET(request: Request, ctx: Params) {
  const { slug } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  try {
    const transactions = await enterprise.listCorpTransactions(auth.enterprise.id, limit);
    return Response.json({ transactions });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: Params) {
  const { slug } = await ctx.params;
  const auth = await authenticateEnterprise(request);
  if (!auth.ok) return auth.error;
  if (auth.enterprise.slug !== slug) {
    return Response.json({ error: "API key does not match this enterprise" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = CreateCorpTxSchema.parse(body);
    const tx = await enterprise.createCorpTransaction({
      enterpriseId: auth.enterprise.id,
      ...parsed,
    });
    return Response.json(tx, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
