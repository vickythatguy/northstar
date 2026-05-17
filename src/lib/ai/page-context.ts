import "server-only";
import { desc, gte } from "drizzle-orm";
import { db, schema } from "../db/client";
import { currentMonth } from "../format";
import type { PageKey } from "./prompts";

/** Build a compact, structured summary of the user's data for a given page,
 *  to drop into the system prompt's <context> block. */
export async function buildPageContext(pageKey: PageKey): Promise<string> {
  switch (pageKey) {
    case "home":
      return homeContext();
    case "budget":
      return budgetContext();
    case "health.weight":
      return weightContext();
    case "health.food":
      return foodContext();
    case "health.exercise":
      return exerciseContext();
    case "journal":
      return journalContext();
    case "settings":
      return "";
  }
}

async function homeContext() {
  const goals = await db.select().from(schema.goals);
  if (goals.length === 0) return "User has no goals yet on the vision board.";
  return [
    `${goals.length} goal${goals.length === 1 ? "" : "s"} on the board:`,
    ...goals
      .slice(0, 12)
      .map((g) => `- [${g.status}] ${g.title}${g.reason ? ` — ${g.reason}` : ""}${g.targetDate ? ` (by ${g.targetDate.toISOString().slice(0, 10)})` : ""}`),
  ].join("\n");
}

async function budgetContext() {
  const month = currentMonth();
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const accounts = await db.select().from(schema.accounts);
  const recent = await db
    .select()
    .from(schema.transactions)
    .where(gte(schema.transactions.createdAt, cutoff))
    .orderBy(desc(schema.transactions.date))
    .limit(80);
  const monthTx = recent.filter((t) => t.date.startsWith(month));
  const spend = monthTx.filter((t) => t.amount < 0);
  const income = monthTx.filter((t) => t.amount > 0);
  const byCat = new Map<string, number>();
  for (const t of spend) {
    const c = t.category ?? "Other";
    byCat.set(c, (byCat.get(c) ?? 0) + Math.abs(t.amount));
  }
  const top = Array.from(byCat.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const acctLines = accounts.map((a) => `- ${a.name} (${a.type}, ${a.source}): ${a.balance.toFixed(2)} ${a.currency}`);
  const recentLines = recent
    .slice(0, 20)
    .map((t) => `  ${t.date} ${t.amount < 0 ? "−" : "+"}${Math.abs(t.amount).toFixed(2)} ${t.category ?? "?"} · ${t.description}`);

  return [
    `Month: ${month}`,
    `Spend MTD: $${spend.reduce((s, t) => s + Math.abs(t.amount), 0).toFixed(2)}`,
    `Income MTD: $${income.reduce((s, t) => s + t.amount, 0).toFixed(2)}`,
    "Top categories MTD:",
    ...top.map(([c, v]) => `  ${c}: $${v.toFixed(2)}`),
    "Accounts:",
    ...acctLines,
    "Recent transactions:",
    ...recentLines,
  ].join("\n");
}

async function weightContext() {
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const rows = await db
    .select()
    .from(schema.weightLogs)
    .where(gte(schema.weightLogs.createdAt, cutoff))
    .orderBy(desc(schema.weightLogs.createdAt))
    .limit(90);
  if (rows.length === 0) return "No weight logs yet.";
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0].weightKg;
  const latest = sorted[sorted.length - 1].weightKg;
  const last7 = sorted.slice(-7);
  const avg7 = last7.reduce((s, r) => s + r.weightKg, 0) / last7.length;
  return [
    `Latest: ${latest.toFixed(1)} kg (on ${sorted[sorted.length - 1].date})`,
    `7-day avg: ${avg7.toFixed(1)} kg`,
    `Since 90-day start: ${(latest - start).toFixed(1)} kg`,
    `Recent: ${sorted.slice(-10).map((r) => `${r.date}=${r.weightKg.toFixed(1)}`).join(", ")}`,
  ].join("\n");
}

async function foodContext() {
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const rows = await db
    .select()
    .from(schema.foodLogs)
    .where(gte(schema.foodLogs.createdAt, cutoff));
  if (rows.length === 0) return "No food logs in the last 7 days.";
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = rows.filter((r) => r.date === today);
  const tot = (k: "calories" | "proteinG" | "carbsG" | "fatG") =>
    todayRows.reduce((s, r) => s + r[k], 0);
  return [
    `Today (${today}): ${tot("calories").toFixed(0)} kcal · P ${tot("proteinG").toFixed(0)}g · C ${tot("carbsG").toFixed(0)}g · F ${tot("fatG").toFixed(0)}g`,
    "Today's items:",
    ...todayRows.map((r) => `  ${r.item}: ${r.calories.toFixed(0)} kcal`),
  ].join("\n");
}

async function exerciseContext() {
  const today = new Date().toISOString().slice(0, 10);
  const dow = new Date(today + "T00:00:00").getDay();
  const splits = await db.select().from(schema.workoutSplits);
  const todaySplit = splits.find((s) => s.dayOfWeek === dow)?.type ?? "Rest";

  const programmed = await db
    .select()
    .from(schema.splitExercises);
  const programmedToday = programmed.filter((p) => p.splitType === todaySplit);

  const last30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const recentWorkouts = await db
    .select()
    .from(schema.workouts)
    .where(gte(schema.workouts.createdAt, last30))
    .orderBy(desc(schema.workouts.date))
    .limit(20);

  const recentSets = await db.select().from(schema.workoutSets).limit(200);

  // Compute PRs (max weight) per exercise
  const prs = new Map<string, number>();
  for (const s of recentSets) {
    if (s.weightKg == null) continue;
    prs.set(s.exerciseName, Math.max(prs.get(s.exerciseName) ?? 0, s.weightKg));
  }

  return [
    `Today is ${today} (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow]}) → ${todaySplit} day.`,
    "Programmed today:",
    ...programmedToday.map(
      (p) =>
        `  ${p.exerciseName}: ${p.targetSets}x${p.targetReps}${p.targetWeightKg ? ` @ ${p.targetWeightKg}kg` : ""}`,
    ),
    "Recent workouts:",
    ...recentWorkouts.slice(0, 8).map((w) => `  ${w.date} (${w.splitType})`),
    "Current PRs (top weight logged per exercise, last 200 sets):",
    ...Array.from(prs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([n, w]) => `  ${n}: ${w}kg`),
  ].join("\n");
}

async function journalContext() {
  const cutoff = new Date(Date.now() - 14 * 24 * 3600 * 1000);
  const rows = await db
    .select()
    .from(schema.journalEntries)
    .where(gte(schema.journalEntries.createdAt, cutoff))
    .orderBy(desc(schema.journalEntries.createdAt))
    .limit(40);
  if (rows.length === 0) return "No journal entries in the last 14 days.";
  return [
    `${rows.length} entries in the last 14 days.`,
    "Recent entries:",
    ...rows.slice(0, 12).map((r) => {
      const cats = safeJSON<string[]>(r.categories, []);
      const date = r.createdAt.toISOString().slice(0, 10);
      const snip = r.body.length > 220 ? r.body.slice(0, 220) + "…" : r.body;
      return `  [${date} · ${cats.join(",")}] ${snip}`;
    }),
  ].join("\n");
}

function safeJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
