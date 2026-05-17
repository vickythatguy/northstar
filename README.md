# northstar

A personal command center — budgets, body, mind, and goals — with an AI co-pilot on every page.

This is a single-user app I built for myself. Not a product, not a SaaS, not multi-tenant. Just my own quiet corner of the internet where the numbers, the workouts, and the journal entries all live together, and where an AI sits in the right margin to help me make sense of them.

## What's inside

- **Vision board** — the home screen. Goals as cards, target dates, the occasional reflection.
- **Budget** — accounts via Plaid (Wealthsimple Cash + my bank), transactions, categories, budgets, the usual. Manual CSV fallback for what Plaid can't reach.
- **Health** — weight chart, food log (CSV + paste-to-parse until I pick a phone-app integration), and an exercise tracker that doubles as my AI gym trainer with a weekly split, today's checklist, and progressive-overload nudges.
- **Journal** — write or speak, entries auto-categorize into `gym`, `health`, `mental health`, `budget`, `goals`. Weekly digest every Sunday.
- **Co-pilot panel** — a persistent chat on the right edge of every page, context-aware to whatever I'm looking at. Text or voice (Whisper).

## Stack

Next.js 15 · TypeScript · Tailwind · shadcn/ui · Drizzle · SQLite (local) / Supabase (deployed) · Anthropic SDK · OpenAI Whisper · Plaid · Recharts

## Status

Personal project, built in the open for my own reference. No issues, no PRs — but if you stumbled in here and want to fork it for yourself, that's the spirit.

## Setup

```bash
npm install                  # or pnpm install
cp .env.example .env.local   # fill in what you have; UI works without keys
npm run dev
```

The SQLite schema bootstraps itself on first connection — no migration step.

API keys are optional to get the shell running. The co-pilot needs `ANTHROPIC_API_KEY`, voice needs `OPENAI_API_KEY` (also used for semantic journal search via embeddings), and account sync needs `PLAID_CLIENT_ID` + `PLAID_SECRET`. The Settings page tells you what's missing.

## A note on Wealthsimple

There is no public personal API for Wealthsimple. Cash accounts come through Plaid; for Invest/Trade positions the app supports manual entry and screenshot OCR. If that changes, this README is the first thing I'll update.

## License

MIT — though there's nothing here you'd want.
