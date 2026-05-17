import { NextRequest } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("splitType");
  if (!type) return Response.json({ error: "splitType required" }, { status: 400 });
  const rows = await db
    .select()
    .from(schema.splitExercises)
    .where(eq(schema.splitExercises.splitType, type))
    .orderBy(asc(schema.splitExercises.sortOrder));
  return Response.json({ exercises: rows });
}

const PostBody = z.object({
  splitType: z.string().min(1).max(40),
  exerciseName: z.string().min(1).max(100),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(100),
  targetWeightKg: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const existing = await db
    .select()
    .from(schema.splitExercises)
    .where(eq(schema.splitExercises.splitType, parsed.data.splitType));
  const id = crypto.randomUUID();
  await db.insert(schema.splitExercises).values({
    id,
    splitType: parsed.data.splitType,
    exerciseName: parsed.data.exerciseName,
    targetSets: parsed.data.targetSets,
    targetReps: parsed.data.targetReps,
    targetWeightKg: parsed.data.targetWeightKg ?? null,
    sortOrder: existing.length,
  });
  return Response.json({ id });
}

const DeleteBody = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.delete(schema.splitExercises).where(eq(schema.splitExercises.id, parsed.data.id));
  return Response.json({ ok: true });
}
