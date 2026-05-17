import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { cosine, embed, hasOpenAIKey } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return Response.json({ entries: [] });

  const rows = await db
    .select()
    .from(schema.journalEntries)
    .orderBy(desc(schema.journalEntries.createdAt))
    .limit(1000);

  // Semantic if we can, otherwise fall back to substring match.
  if (hasOpenAIKey()) {
    const queryVec = await embed(q).catch(() => null);
    if (queryVec) {
      const scored = rows
        .map((r) => {
          if (!r.embedding) return null;
          try {
            const v = JSON.parse(r.embedding) as number[];
            return { r, score: cosine(queryVec, v) };
          } catch {
            return null;
          }
        })
        .filter((x): x is { r: typeof rows[0]; score: number } => x !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .filter((x) => x.score > 0.2);

      return Response.json({
        mode: "semantic",
        entries: scored.map(({ r, score }) => ({
          id: r.id,
          body: r.body,
          categories: safeJSON<string[]>(r.categories, []),
          createdAt: r.createdAt.getTime(),
          score,
        })),
      });
    }
  }

  const needle = q.toLowerCase();
  const matches = rows
    .filter((r) => r.body.toLowerCase().includes(needle))
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      body: r.body,
      categories: safeJSON<string[]>(r.categories, []),
      createdAt: r.createdAt.getTime(),
      score: 0,
    }));
  return Response.json({ mode: "keyword", entries: matches });
}

function safeJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
