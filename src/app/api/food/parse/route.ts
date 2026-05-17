import { NextRequest } from "next/server";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { parseFoodLog } from "@/lib/ai/structured";
import { hasAnthropicKey } from "@/lib/ai/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  text: z.string().min(1).max(8000),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!hasAnthropicKey()) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set; can't parse." }, { status: 503 });
  }
  const rows = await parseFoodLog(parsed.data.text);
  if (rows.length === 0) {
    return Response.json({ inserted: 0, rows: [] });
  }
  const inserted: { id: string; item: string }[] = [];
  for (const r of rows) {
    const id = crypto.randomUUID();
    await db.insert(schema.foodLogs).values({
      id,
      date: parsed.data.date,
      item: r.item,
      calories: r.calories,
      proteinG: r.protein_g,
      carbsG: r.carbs_g,
      fatG: r.fat_g,
      source: "paste-parse",
      createdAt: new Date(),
    });
    inserted.push({ id, item: r.item });
  }
  return Response.json({ inserted: inserted.length, rows: inserted });
}
