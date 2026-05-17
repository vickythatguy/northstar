import "server-only";
import { CATEGORIZE_MODEL, COPILOT_MODEL, getAnthropic, hasAnthropicKey } from "./anthropic";
import { JOURNAL_CATEGORIES, TX_CATEGORIES } from "../categories";

/** Run a one-shot prompt and parse the model's reply as JSON.
 *  Throws if the API key is missing or the reply isn't valid JSON. */
async function callJSON<T>(opts: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
}): Promise<T> {
  if (!hasAnthropicKey()) throw new Error("ANTHROPIC_API_KEY is not set.");
  const client = getAnthropic();
  const res = await client.messages.create({
    model: opts.model ?? CATEGORIZE_MODEL,
    max_tokens: opts.maxTokens ?? 800,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const block = res.content.find((c) => c.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  const json = extractJSON(text);
  return JSON.parse(json) as T;
}

function extractJSON(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const firstBrace = text.search(/[\[{]/);
  if (firstBrace === -1) return text.trim();
  return text.slice(firstBrace).trim();
}

/** Pick journal categories for an entry. Returns 1–3 categories from the catalog. */
export async function categorizeJournal(body: string): Promise<string[]> {
  const system = `You file personal journal entries by topic. Choose 1–3 categories from the allowed list. Return ONLY a JSON array of strings, e.g. ["gym","goals"]. Never invent new categories.

Allowed categories: ${JOURNAL_CATEGORIES.join(", ")}.`;
  const user = `Entry:\n\n${body}\n\nReturn the JSON array now.`;
  try {
    const arr = await callJSON<string[]>({ system, user });
    return arr
      .filter((c): c is string => typeof c === "string")
      .map((c) => c.toLowerCase().trim())
      .filter((c) => (JOURNAL_CATEGORIES as readonly string[]).includes(c))
      .slice(0, 3);
  } catch {
    return ["misc"];
  }
}

/** Pick a transaction category from the catalog. Returns one category. */
export async function categorizeTransaction(input: {
  description: string;
  amount: number;
  examples?: { description: string; category: string }[];
}): Promise<string> {
  const fewShot =
    input.examples && input.examples.length > 0
      ? `\n\nMy prior labels (few-shot):\n${input.examples
          .slice(0, 12)
          .map((e) => `- "${e.description}" -> ${e.category}`)
          .join("\n")}`
      : "";
  const system = `You categorize personal bank/credit transactions for a single user in Canada. Pick exactly one category from the allowed list. Return ONLY a JSON object like {"category": "Groceries"}.

Allowed: ${TX_CATEGORIES.join(", ")}.${fewShot}`;
  const user = `Description: "${input.description}"\nAmount: ${input.amount}\nReturn the JSON now.`;
  try {
    const obj = await callJSON<{ category: string }>({ system, user });
    const c = (obj.category ?? "").trim();
    if ((TX_CATEGORIES as readonly string[]).includes(c)) return c;
    return "Other";
  } catch {
    return "Other";
  }
}

export type ParsedFoodItem = {
  item: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/** Parse a free-form food log into structured rows. */
export async function parseFoodLog(text: string): Promise<ParsedFoodItem[]> {
  const system = `You convert free-form daily food logs into structured rows. Return ONLY a JSON array of objects with keys: item (string), calories (number), protein_g (number), carbs_g (number), fat_g (number). Make reasonable estimates if grams aren't stated. No commentary.`;
  const user = `Today's log:\n\n${text}\n\nReturn the JSON array now.`;
  try {
    const arr = await callJSON<ParsedFoodItem[]>({
      system,
      user,
      maxTokens: 1500,
    });
    return arr
      .filter((r) => r && typeof r.item === "string")
      .map((r) => ({
        item: r.item,
        calories: Number(r.calories) || 0,
        protein_g: Number(r.protein_g) || 0,
        carbs_g: Number(r.carbs_g) || 0,
        fat_g: Number(r.fat_g) || 0,
      }));
  } catch {
    return [];
  }
}

/** Compose a weekly journal digest. */
export async function weeklyDigest(input: {
  entries: { body: string; categories: string[]; createdAt: number }[];
}): Promise<string> {
  const system = `You write a one-page weekly reflection from a person's own journal entries. Group by category. Quote sparingly, use the user's own words where possible. Plainspoken, warm. End with one good question.`;
  const lines = input.entries
    .map(
      (e) =>
        `[${new Date(e.createdAt).toISOString().slice(0, 10)} · ${e.categories.join(",")}] ${e.body.slice(0, 600)}`,
    )
    .join("\n\n");
  if (!hasAnthropicKey()) {
    return "Add ANTHROPIC_API_KEY to generate digests. For now, here are the raw entries:\n\n" + lines;
  }
  const client = getAnthropic();
  const res = await client.messages.create({
    model: COPILOT_MODEL,
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: `Entries from this week:\n\n${lines}\n\nWrite the digest now.` }],
  });
  const block = res.content.find((c) => c.type === "text");
  return block && block.type === "text" ? block.text : "";
}
