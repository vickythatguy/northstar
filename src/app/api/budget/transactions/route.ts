import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { categorizeTransaction } from "@/lib/ai/structured";
import { TX_CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(schema.transactions)
    .orderBy(desc(schema.transactions.date))
    .limit(1000);
  return Response.json({ transactions: rows });
}

const PostBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  amount: z.number(),
  accountId: z.string().optional().nullable(),
  category: z.string().optional(),
  source: z.enum(["manual", "csv", "plaid"]).default("manual"),
});

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const p = parsed.data;
  let category = p.category;
  if (!category) {
    const examples = await db
      .select({
        description: schema.transactions.description,
        category: schema.transactions.category,
      })
      .from(schema.transactions)
      .where(eq(schema.transactions.source, "manual"))
      .limit(20);
    category = await categorizeTransaction({
      description: p.description,
      amount: p.amount,
      examples: examples.filter((e): e is { description: string; category: string } => Boolean(e.category)),
    });
  }
  const id = crypto.randomUUID();
  await db.insert(schema.transactions).values({
    id,
    accountId: p.accountId ?? null,
    date: p.date,
    description: p.description,
    rawDescription: p.description,
    amount: p.amount,
    category,
    source: p.source,
    createdAt: new Date(),
  });
  return Response.json({ id, category });
}

const PatchBody = z.object({
  id: z.string().min(1),
  category: z.enum(TX_CATEGORIES as unknown as [string, ...string[]]).optional(),
  description: z.string().min(1).max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const updates: Partial<typeof schema.transactions.$inferInsert> = {};
  if (parsed.data.category) updates.category = parsed.data.category;
  if (parsed.data.description) updates.description = parsed.data.description;
  await db.update(schema.transactions).set(updates).where(eq(schema.transactions.id, parsed.data.id));
  return Response.json({ ok: true });
}

const DeleteBody = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.delete(schema.transactions).where(eq(schema.transactions.id, parsed.data.id));
  return Response.json({ ok: true });
}
