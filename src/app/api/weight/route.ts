import { NextRequest } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().positive().max(500),
  note: z.string().max(500).optional(),
});

export async function GET() {
  const rows = await db
    .select()
    .from(schema.weightLogs)
    .orderBy(asc(schema.weightLogs.date));
  return Response.json({
    logs: rows.map((r) => ({
      id: r.id,
      date: r.date,
      weightKg: r.weightKg,
      note: r.note,
      createdAt: r.createdAt.getTime(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { date, weightKg, note } = parsed.data;
  await db.insert(schema.weightLogs).values({
    id: crypto.randomUUID(),
    date,
    weightKg,
    note: note ?? null,
    createdAt: new Date(),
  });
  return Response.json({ ok: true });
}

const DeleteBody = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.delete(schema.weightLogs).where(eq(schema.weightLogs.id, parsed.data.id));
  return Response.json({ ok: true });
}
