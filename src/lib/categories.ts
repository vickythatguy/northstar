export const JOURNAL_CATEGORIES = [
  "gym",
  "health",
  "mental health",
  "budget",
  "goals",
  "work",
  "relationships",
  "misc",
] as const;

export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number];

export const TX_CATEGORIES = [
  "Groceries",
  "Restaurants",
  "Transport",
  "Rent",
  "Utilities",
  "Subscriptions",
  "Shopping",
  "Travel",
  "Health",
  "Fitness",
  "Entertainment",
  "Gifts",
  "Fees",
  "Income",
  "Transfer",
  "Other",
] as const;

export type TxCategory = (typeof TX_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  gym: "#c47e4f",
  health: "#7a9b6c",
  "mental health": "#9b87c4",
  budget: "#c4a87a",
  goals: "#7a98c4",
  work: "#6c7a8c",
  relationships: "#c46c8c",
  misc: "#a8a8a8",
};
