import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(schema.accounts);
  return Response.json({
    accounts: rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      source: r.source,
      balance: r.balance,
      currency: r.currency,
      lastSyncedAt: r.lastSyncedAt?.getTime() ?? null,
    })),
  });
}

const PostBody = z.object({
  name: z.string().min(1).max(80),
  type: z.string().min(1).max(20),
  source: z.enum(["manual", "csv", "plaid"]).default("manual"),
  balance: z.number().default(0),
  currency: z.string().default("CAD"),
});

export async function POST(req: NextRequest) {
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const id = crypto.randomUUID();
  await db.insert(schema.accounts).values({
    id,
    name: parsed.data.name,
    type: parsed.data.type,
    source: parsed.data.source,
    balance: parsed.data.balance,
    currency: parsed.data.currency,
    createdAt: new Date(),
  });
  return Response.json({ id });
}

const DeleteBody = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.delete(schema.accounts).where(eq(schema.accounts.id, parsed.data.id));
  return Response.json({ ok: true });
}
