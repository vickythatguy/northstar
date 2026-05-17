import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(schema.foodLogs)
    .orderBy(desc(schema.foodLogs.date));
  return Response.json({ logs: rows });
}

const PostBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  item: z.string().min(1).max(200),
  calories: z.number().min(0).default(0),
  protein_g: z.number().min(0).default(0),
  carbs_g: z.number().min(0).default(0),
  fat_g: z.number().min(0).default(0),
  source: z.string().default("manual"),
});

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const p = parsed.data;
  const id = crypto.randomUUID();
  await db.insert(schema.foodLogs).values({
    id,
    date: p.date,
    item: p.item,
    calories: p.calories,
    proteinG: p.protein_g,
    carbsG: p.carbs_g,
    fatG: p.fat_g,
    source: p.source,
    createdAt: new Date(),
  });
  return Response.json({ id });
}

const DeleteBody = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.delete(schema.foodLogs).where(eq(schema.foodLogs.id, parsed.data.id));
  return Response.json({ ok: true });
}
