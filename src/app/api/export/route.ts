import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [
    goals,
    chats,
    journal,
    weight,
    food,
    splits,
    splitEx,
    workouts,
    sets,
    accounts,
    tx,
    budgets,
  ] = await Promise.all([
    db.select().from(schema.goals),
    db.select().from(schema.chatMessages),
    db.select().from(schema.journalEntries),
    db.select().from(schema.weightLogs),
    db.select().from(schema.foodLogs),
    db.select().from(schema.workoutSplits),
    db.select().from(schema.splitExercises),
    db.select().from(schema.workouts),
    db.select().from(schema.workoutSets),
    db.select().from(schema.accounts),
    db.select().from(schema.transactions),
    db.select().from(schema.budgets),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: "v1",
    goals,
    chatMessages: chats,
    journalEntries: journal.map((e) => ({ ...e, embedding: undefined })),
    weightLogs: weight,
    foodLogs: food,
    workoutSplits: splits,
    splitExercises: splitEx,
    workouts,
    workoutSets: sets,
    accounts,
    transactions: tx,
    budgets,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="northstar-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
