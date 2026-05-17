export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasKeys = Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
  return Response.json({
    configured: hasKeys,
    env: process.env.PLAID_ENV ?? null,
    note: hasKeys
      ? "Keys are set. Plaid Link flow is not yet wired — use manual or CSV until link UI lands."
      : "Set PLAID_CLIENT_ID + PLAID_SECRET in .env.local to enable Plaid. Use CSV import in the meantime.",
    wealthsimpleNote:
      "Wealthsimple Cash: works via Plaid in Canada. Wealthsimple Invest/Trade: no public retail API — use manual positions or screenshot OCR.",
  });
}
