import { NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { categorizeJournal } from "@/lib/ai/structured";
import { embed } from "@/lib/ai/openai";
import { JOURNAL_CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  body: z.string().min(1).max(20000),
  categories: z.array(z.string()).optional(),
  source: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 200), 500);

  const rows = await db
    .select()
    .from(schema.journalEntries)
    .orderBy(desc(schema.journalEntries.createdAt))
    .limit(limit);

  const entries = rows.map((r) => ({
    id: r.id,
    body: r.body,
    categories: safeJSON<string[]>(r.categories, []),
    source: r.source,
    hasEmbedding: Boolean(r.embedding),
    createdAt: r.createdAt.getTime(),
    updatedAt: r.updatedAt.getTime(),
  }));

  const filtered = category
    ? entries.filter((e) => e.categories.includes(category))
    : entries;

  // Per-category counts for sidebar
  const counts: Record<string, number> = {};
  for (const c of JOURNAL_CATEGORIES) counts[c] = 0;
  for (const e of entries) for (const c of e.categories) counts[c] = (counts[c] ?? 0) + 1;

  return Response.json({ entries: filtered, counts, total: entries.length });
}

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { body, source } = parsed.data;
  let categories = parsed.data.categories;
  if (!categories || categories.length === 0) {
    categories = await categorizeJournal(body);
  }

  const now = new Date();
  const id = crypto.randomUUID();

  let embeddingJSON: string | null = null;
  const vec = await embed(body).catch(() => null);
  if (vec) embeddingJSON = JSON.stringify(vec);

  await db.insert(schema.journalEntries).values({
    id,
    body,
    categories: JSON.stringify(categories),
    source: source ?? "manual",
    embedding: embeddingJSON,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({
    id,
    body,
    categories,
    source: source ?? "manual",
    hasEmbedding: Boolean(embeddingJSON),
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
  });
}

const PatchBody = z.object({
  id: z.string().min(1),
  categories: z.array(z.string()).optional(),
  body: z.string().min(1).max(20000).optional(),
});

export async function PATCH(req: NextRequest) {
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const updates: Partial<typeof schema.journalEntries.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.categories) updates.categories = JSON.stringify(parsed.data.categories);
  if (parsed.data.body) updates.body = parsed.data.body;
  await db
    .update(schema.journalEntries)
    .set(updates)
    .where(eq(schema.journalEntries.id, parsed.data.id));
  return Response.json({ ok: true });
}

const DeleteBody = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await db.delete(schema.journalEntries).where(eq(schema.journalEntries.id, parsed.data.id));
  return Response.json({ ok: true });
}

function safeJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
