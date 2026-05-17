import { desc, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { weeklyDigest } from "@/lib/ai/structured";
import { embed } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const rows = await db
    .select()
    .from(schema.journalEntries)
    .where(gte(schema.journalEntries.createdAt, sevenDaysAgo))
    .orderBy(desc(schema.journalEntries.createdAt));

  if (rows.length === 0) {
    return Response.json({ error: "Nothing from this week to digest." }, { status: 400 });
  }

  const text = await weeklyDigest({
    entries: rows.map((r) => ({
      body: r.body,
      categories: safeJSON<string[]>(r.categories, []),
      createdAt: r.createdAt.getTime(),
    })),
  });

  const id = crypto.randomUUID();
  const now = new Date();
  let embeddingJSON: string | null = null;
  const vec = await embed(text).catch(() => null);
  if (vec) embeddingJSON = JSON.stringify(vec);

  await db.insert(schema.journalEntries).values({
    id,
    body: text,
    categories: JSON.stringify(["misc"]),
    source: "digest",
    embedding: embeddingJSON,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id, text });
}

function safeJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
