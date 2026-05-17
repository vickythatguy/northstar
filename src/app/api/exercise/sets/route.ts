import { NextRequest } from "next/server";
import { z } from "zod";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  splitType: z.string().min(1),
  exerciseName: z.string().min(1),
  setNumber: z.number().int().min(1).max(50),
  weightKg: z.number().nullable().optional(),
  reps: z.number().int().nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const p = parsed.data;

  // Find-or-create workout for this date+splitType
  const existing = await db
    .select()
    .from(schema.workouts)
    .where(and(eq(schema.workouts.date, p.date), eq(schema.workouts.splitType, p.splitType)))
    .limit(1);

  let workoutId: string;
  if (existing.length > 0) {
    workoutId = existing[0].id;
  } else {
    workoutId = crypto.randomUUID();
    await db.insert(schema.workouts).values({
      id: workoutId,
      date: p.date,
      splitType: p.splitType,
      notes: null,
      createdAt: new Date(),
    });
  }

  await db.insert(schema.workoutSets).values({
    id: crypto.randomUUID(),
    workoutId,
    exerciseName: p.exerciseName,
    setNumber: p.setNumber,
    weightKg: p.weightKg ?? null,
    reps: p.reps ?? null,
    rpe: p.rpe ?? null,
    createdAt: new Date(),
  });

  return Response.json({ ok: true, workoutId });
}

export async function GET(req: NextRequest) {
  const exercise = req.nextUrl.searchParams.get("exercise");
  const date = req.nextUrl.searchParams.get("date");

  if (date) {
    const ws = await db.select().from(schema.workouts).where(eq(schema.workouts.date, date));
    if (ws.length === 0) return Response.json({ sets: [] });
    const sets = await db
      .select()
      .from(schema.workoutSets)
      .where(eq(schema.workoutSets.workoutId, ws[0].id))
      .orderBy(asc(schema.workoutSets.setNumber));
    return Response.json({ sets, workout: ws[0] });
  }

  if (exercise) {
    const sets = await db
      .select({
        id: schema.workoutSets.id,
        weightKg: schema.workoutSets.weightKg,
        reps: schema.workoutSets.reps,
        date: schema.workouts.date,
      })
      .from(schema.workoutSets)
      .innerJoin(schema.workouts, eq(schema.workoutSets.workoutId, schema.workouts.id))
      .where(eq(schema.workoutSets.exerciseName, exercise))
      .orderBy(desc(schema.workouts.date));
    return Response.json({ sets });
  }

  return Response.json({ error: "exercise or date required" }, { status: 400 });
}

const DeleteBody = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.delete(schema.workoutSets).where(eq(schema.workoutSets.id, parsed.data.id));
  return Response.json({ ok: true });
}
