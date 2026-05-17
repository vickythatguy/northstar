import { NextRequest } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { COPILOT_MODEL, getAnthropic, hasAnthropicKey } from "@/lib/ai/anthropic";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { buildPageContext } from "@/lib/ai/page-context";
import { PAGE_PROMPTS, type PageKey } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_KEYS = Object.keys(PAGE_PROMPTS) as PageKey[];

const PostBody = z.object({
  pageKey: z.enum(PAGE_KEYS as [PageKey, ...PageKey[]]),
  message: z.string().min(1).max(8000),
  // Pages can hand structured context that gets injected into the system prompt.
  // Step 2 doesn't use it yet — left wired so step 3+ pages can drop data in.
  context: z.string().max(20000).optional(),
});

const MAX_HISTORY_TURNS = 30;

export async function GET(req: NextRequest) {
  const pageKey = req.nextUrl.searchParams.get("pageKey");
  if (!pageKey || !PAGE_KEYS.includes(pageKey as PageKey)) {
    return Response.json({ error: "Invalid pageKey" }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.pageKey, pageKey))
    .orderBy(asc(schema.chatMessages.createdAt));

  return Response.json({
    messages: rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      createdAt: r.createdAt.getTime(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { pageKey, message, context } = parsed.data;
  const now = Date.now();

  const userRow = {
    id: crypto.randomUUID(),
    pageKey,
    role: "user" as const,
    content: message,
    createdAt: new Date(now),
  };
  await db.insert(schema.chatMessages).values(userRow);

  if (!hasAnthropicKey()) {
    const fallback =
      "I'm here, but `ANTHROPIC_API_KEY` isn't set. Add it to `.env.local` and I'll be able to actually think.";
    const assistantRow = {
      id: crypto.randomUUID(),
      pageKey,
      role: "assistant" as const,
      content: fallback,
      createdAt: new Date(now + 1),
    };
    await db.insert(schema.chatMessages).values(assistantRow);
    return streamPlain(fallback, assistantRow.id);
  }

  // Pull recent history (excluding the just-inserted user message,
  // which we'll re-add explicitly as the final turn).
  const history = await db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.pageKey, pageKey))
    .orderBy(asc(schema.chatMessages.createdAt));

  const trimmed = history.slice(-MAX_HISTORY_TURNS).map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
  }));

  // Server-side context: pull live data for this page; client-supplied context is appended.
  const liveContext = await buildPageContext(pageKey).catch(() => "");
  const mergedContext = [liveContext, context].filter(Boolean).join("\n\n");
  const system = buildSystemPrompt(pageKey, mergedContext);
  const anthropic = getAnthropic();
  const assistantId = crypto.randomUUID();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        const response = anthropic.messages.stream({
          model: COPILOT_MODEL,
          max_tokens: 1024,
          system,
          messages: trimmed,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error talking to Anthropic.";
        const note = `\n\n_(co-pilot error: ${msg})_`;
        full += note;
        controller.enqueue(encoder.encode(note));
      } finally {
        await db.insert(schema.chatMessages).values({
          id: assistantId,
          pageKey,
          role: "assistant",
          content: full,
          createdAt: new Date(Date.now()),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Assistant-Id": assistantId,
      "Cache-Control": "no-store",
    },
  });
}

function streamPlain(text: string, assistantId: string) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Assistant-Id": assistantId,
      "Cache-Control": "no-store",
    },
  });
}
