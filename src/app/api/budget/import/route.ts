import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { categorizeTransaction } from "@/lib/ai/structured";
import { hasAnthropicKey } from "@/lib/ai/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Row = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  amount: z.number(),
});

const Body = z.object({
  accountId: z.string().optional().nullable(),
  rows: z.array(Row).min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { accountId, rows } = parsed.data;

  const examples = hasAnthropicKey()
    ? (
        await db
          .select({
            description: schema.transactions.description,
            category: schema.transactions.category,
          })
          .from(schema.transactions)
          .limit(20)
      ).filter((e): e is { description: string; category: string } => Boolean(e.category))
    : [];

  let imported = 0;
  for (const r of rows) {
    let category = "Other";
    if (hasAnthropicKey()) {
      category = await categorizeTransaction({
        description: r.description,
        amount: r.amount,
        examples,
      });
    }
    await db.insert(schema.transactions).values({
      id: crypto.randomUUID(),
      accountId: accountId ?? null,
      date: r.date,
      description: r.description,
      rawDescription: r.description,
      amount: r.amount,
      category,
      source: "csv",
      createdAt: new Date(),
    });
    imported++;
  }

  return Response.json({ imported });
}
