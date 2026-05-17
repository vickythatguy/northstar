export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    plaid: Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
    plaidEnv: process.env.PLAID_ENV ?? null,
    copilotModel: process.env.ANTHROPIC_COPILOT_MODEL ?? "claude-sonnet-4-6",
    categorizeModel: process.env.ANTHROPIC_CATEGORIZE_MODEL ?? "claude-haiku-4-5-20251001",
  });
}
