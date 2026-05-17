import { NextRequest } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(schema.goals).orderBy(asc(schema.goals.sortOrder));
  return Response.json({
    goals: rows.map((r) => ({
      id: r.id,
      title: r.title,
      reason: r.reason,
      imageUrl: r.imageUrl,
      targetDate: r.targetDate?.getTime() ?? null,
      status: r.status,
      sortOrder: r.sortOrder,
    })),
  });
}

const PostBody = z.object({
  title: z.string().min(1).max(120),
  reason: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  status: z.enum(["active", "done", "parked"]).default("active"),
});

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const all = await db.select().from(schema.goals);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(schema.goals).values({
    id,
    title: parsed.data.title,
    reason: parsed.data.reason ?? null,
    imageUrl: parsed.data.imageUrl ?? null,
    targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
    status: parsed.data.status,
    sortOrder: all.length,
    createdAt: now,
    updatedAt: now,
  });
  return Response.json({ id });
}

const PatchBody = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120).optional(),
  reason: z.string().max(500).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  status: z.enum(["active", "done", "parked"]).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest) {
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const updates: Partial<typeof schema.goals.$inferInsert> = { updatedAt: new Date() };
  if (rest.title !== undefined) updates.title = rest.title;
  if (rest.reason !== undefined) updates.reason = rest.reason;
  if (rest.imageUrl !== undefined) updates.imageUrl = rest.imageUrl;
  if (rest.status !== undefined) updates.status = rest.status;
  if (rest.sortOrder !== undefined) updates.sortOrder = rest.sortOrder;
  if (rest.targetDate !== undefined) {
    updates.targetDate = rest.targetDate ? new Date(rest.targetDate) : null;
  }
  await db.update(schema.goals).set(updates).where(eq(schema.goals.id, id));
  return Response.json({ ok: true });
}

const ReorderBody = z.object({ ids: z.array(z.string().min(1)) });

export async function PUT(req: NextRequest) {
  const parsed = ReorderBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  for (let i = 0; i < parsed.data.ids.length; i++) {
    await db
      .update(schema.goals)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(eq(schema.goals.id, parsed.data.ids[i]));
  }
  return Response.json({ ok: true });
}

const DeleteBody = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.delete(schema.goals).where(eq(schema.goals.id, parsed.data.id));
  return Response.json({ ok: true });
}
