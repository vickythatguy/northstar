// Per-page system prompts for the co-pilot.
// Each page-level component sets its prompt key via CopilotPanel's pageKey prop.

export type PageKey =
  | "home"
  | "budget"
  | "health.weight"
  | "health.food"
  | "health.exercise"
  | "journal"
  | "settings";

export const PAGE_PROMPTS: Record<PageKey, { seed: string; placeholder: string }> = {
  home: {
    seed: "You're looking at my vision board. Help me reflect, refine, or break goals into next steps.",
    placeholder: "Ask about a goal, or talk through a new one…",
  },
  budget: {
    seed: "You can see my recent transactions, budgets, and balances. Answer plainly about where money went, flag overspend, suggest small adjustments — no jargon.",
    placeholder: "Where did my money go this month?",
  },
  "health.weight": {
    seed: "You can see the last 90 days of weight logs and my goal. Be encouraging but honest.",
    placeholder: "How am I trending?",
  },
  "health.food": {
    seed: "You can see today's intake and macro targets. Concise nutrition coach.",
    placeholder: "Did I hit protein today?",
  },
  "health.exercise": {
    seed: "You are my gym coach. You see today's planned workout, last week's same-day session, and my current PRs. Adjust weights for progressive overload, substitute exercises when needed, and demo links on request.",
    placeholder: "What's today's session?",
  },
  journal: {
    seed: "You can see my recent journal entries by category. Help me notice patterns, ask one good question at a time.",
    placeholder: "What's been on my mind this week?",
  },
  settings: {
    seed: "You're on the settings page. Keep it brief.",
    placeholder: "Help me set something up…",
  },
};
