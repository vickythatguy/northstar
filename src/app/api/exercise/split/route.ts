import { NextRequest } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SPLIT = [
  { dayOfWeek: 0, type: "Rest" },
  { dayOfWeek: 1, type: "Push" },
  { dayOfWeek: 2, type: "Pull" },
  { dayOfWeek: 3, type: "Legs" },
  { dayOfWeek: 4, type: "Push" },
  { dayOfWeek: 5, type: "Pull" },
  { dayOfWeek: 6, type: "Legs" },
];

export async function GET() {
  const rows = await db.select().from(schema.workoutSplits).orderBy(asc(schema.workoutSplits.dayOfWeek));
  if (rows.length === 0) {
    // seed defaults idempotently
    await db.insert(schema.workoutSplits).values(DEFAULT_SPLIT);
    return Response.json({ split: DEFAULT_SPLIT });
  }
  return Response.json({ split: rows.map((r) => ({ dayOfWeek: r.dayOfWeek, type: r.type })) });
}

const PostBody = z.object({
  split: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), type: z.string().min(1).max(40) })).length(7),
});

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  for (const row of parsed.data.split) {
    await db
      .insert(schema.workoutSplits)
      .values(row)
      .onConflictDoUpdate({ target: schema.workoutSplits.dayOfWeek, set: { type: row.type } });
  }
  return Response.json({ ok: true });
}
