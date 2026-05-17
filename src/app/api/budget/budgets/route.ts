import { NextRequest } from "next/server";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");
  if (!month) return Response.json({ error: "month required" }, { status: 400 });
  const rows = await db.select().from(schema.budgets).where(eq(schema.budgets.month, month));
  return Response.json({ budgets: rows });
}

const PostBody = z.object({
  category: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().min(0),
});

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { category, month, amount } = parsed.data;

  const existing = await db
    .select()
    .from(schema.budgets)
    .where(and(eq(schema.budgets.category, category), eq(schema.budgets.month, month)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(schema.budgets).set({ amount }).where(eq(schema.budgets.id, existing[0].id));
  } else {
    await db
      .insert(schema.budgets)
      .values({ id: crypto.randomUUID(), category, month, amount });
  }
  return Response.json({ ok: true });
}
