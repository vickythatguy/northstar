"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardKicker } from "@/components/ui/card";
import { todayISO } from "@/lib/format";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SPLIT_OPTIONS = ["Push", "Pull", "Legs", "Upper", "Lower", "Full", "Cardio", "Rest"];

type SplitDay = { dayOfWeek: number; type: string };
type Programmed = {
  id: string;
  splitType: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number | null;
  sortOrder: number;
};
type SetRow = {
  id: string;
  workoutId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  createdAt: number;
};

export function ExercisePageClient() {
  const today = useMemo(() => todayISO(), []);
  const todayDow = new Date(today + "T00:00:00").getDay();

  const [split, setSplit] = useState<SplitDay[]>([]);
  const [programmed, setProgrammed] = useState<Programmed[]>([]);
  const [todaysSets, setTodaysSets] = useState<SetRow[]>([]);
  const [editingSplit, setEditingSplit] = useState(false);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<{ date: string; weightKg: number | null; reps: number | null }[]>([]);

  const todaySplit = split.find((s) => s.dayOfWeek === todayDow)?.type ?? "Rest";

  const loadSplit = useCallback(async () => {
    const res = await fetch("/api/exercise/split");
    if (!res.ok) return;
    const data = (await res.json()) as { split: SplitDay[] };
    setSplit(data.split);
  }, []);

  const loadProgrammed = useCallback(async (type: string) => {
    if (!type || type === "Rest") {
      setProgrammed([]);
      return;
    }
    const res = await fetch(`/api/exercise/programmed?splitType=${encodeURIComponent(type)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { exercises: Programmed[] };
    setProgrammed(data.exercises);
  }, []);

  const loadTodaysSets = useCallback(async () => {
    const res = await fetch(`/api/exercise/sets?date=${today}`);
    if (!res.ok) return;
    const data = (await res.json()) as { sets: SetRow[] };
    setTodaysSets(data.sets ?? []);
  }, [today]);

  useEffect(() => {
    loadSplit();
    loadTodaysSets();
  }, [loadSplit, loadTodaysSets]);

  useEffect(() => {
    loadProgrammed(todaySplit);
  }, [todaySplit, loadProgrammed]);

  async function saveSplit() {
    await fetch("/api/exercise/split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ split }),
    });
    setEditingSplit(false);
  }

  async function logSet(exerciseName: string, setNumber: number, weightKg: number | null, reps: number | null) {
    await fetch("/api/exercise/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        splitType: todaySplit,
        exerciseName,
        setNumber,
        weightKg,
        reps,
      }),
    });
    await loadTodaysSets();
  }

  async function removeSet(id: string) {
    await fetch("/api/exercise/sets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadTodaysSets();
  }

  async function addProgrammed(form: {
    exerciseName: string;
    targetSets: number;
    targetReps: number;
    targetWeightKg: number | null;
  }) {
    await fetch("/api/exercise/programmed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, splitType: todaySplit }),
    });
    await loadProgrammed(todaySplit);
  }

  async function removeProgrammed(id: string) {
    await fetch("/api/exercise/programmed", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadProgrammed(todaySplit);
  }

  async function loadHistory(name: string) {
    if (historyExercise === name) {
      setHistoryExercise(null);
      setHistoryData([]);
      return;
    }
    setHistoryExercise(name);
    const res = await fetch(`/api/exercise/sets?exercise=${encodeURIComponent(name)}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      sets: { date: string; weightKg: number | null; reps: number | null }[];
    };
    // Aggregate top set per date (max weight)
    const byDate = new Map<string, { weightKg: number; reps: number | null }>();
    for (const s of data.sets) {
      if (s.weightKg == null) continue;
      const cur = byDate.get(s.date);
      if (!cur || (s.weightKg ?? 0) > cur.weightKg) {
        byDate.set(s.date, { weightKg: s.weightKg!, reps: s.reps });
      }
    }
    const series = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, weightKg: v.weightKg, reps: v.reps }));
    setHistoryData(series);
  }

  const grouped = useMemo(() => {
    const m = new Map<string, SetRow[]>();
    for (const s of todaysSets) {
      const arr = m.get(s.exerciseName) ?? [];
      arr.push(s);
      m.set(s.exerciseName, arr);
    }
    return m;
  }, [todaysSets]);

  return (
    <div className="space-y-8">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <CardKicker>Weekly split</CardKicker>
            <h3 className="font-serif text-lg">
              Today is <span className="text-accent">{todaySplit}</span>
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditingSplit((v) => !v)}>
            {editingSplit ? "Done" : "Edit"}
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {split.map((d) => (
            <div
              key={d.dayOfWeek}
              className={`rounded-md border p-2 text-center text-xs ${
                d.dayOfWeek === todayDow ? "border-accent" : "border-border"
              }`}
            >
              <div className="font-medium">{DAY_NAMES[d.dayOfWeek]}</div>
              {editingSplit ? (
                <select
                  value={d.type}
                  onChange={(e) => {
                    setSplit((cur) =>
                      cur.map((x) => (x.dayOfWeek === d.dayOfWeek ? { ...x, type: e.target.value } : x)),
                    );
                  }}
                  className="mt-1 w-full rounded border border-border bg-card px-1 py-0.5 text-xs"
                >
                  {SPLIT_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1 text-muted-foreground">{d.type}</div>
              )}
            </div>
          ))}
        </div>
        {editingSplit && (
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={saveSplit}>
              Save split
            </Button>
          </div>
        )}
      </Card>

      {todaySplit !== "Rest" && (
        <Card className="p-4">
          <h3 className="mb-3 font-serif text-lg">Today's session · {todaySplit}</h3>
          {programmed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing programmed for {todaySplit} yet. Add an exercise below — or ask the co-pilot to suggest one.
            </p>
          ) : (
            <ul className="space-y-3">
              {programmed.map((p) => {
                const logged = grouped.get(p.exerciseName) ?? [];
                const nextSet = logged.length + 1;
                return (
                  <li key={p.id} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{p.exerciseName}</p>
                        <p className="text-xs text-muted-foreground">
                          Target: {p.targetSets} × {p.targetReps}
                          {p.targetWeightKg ? ` @ ${p.targetWeightKg} kg` : ""}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => loadHistory(p.exerciseName)}>
                          {historyExercise === p.exerciseName ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          History
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeProgrammed(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <SetLogger
                      exerciseName={p.exerciseName}
                      nextSet={nextSet}
                      defaultWeight={p.targetWeightKg}
                      defaultReps={p.targetReps}
                      onLog={(w, r) => logSet(p.exerciseName, nextSet, w, r)}
                    />

                    {logged.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {logged.map((s) => (
                          <li key={s.id} className="flex items-center justify-between">
                            <span>
                              Set {s.setNumber} · {s.weightKg ?? "—"} kg × {s.reps ?? "—"} reps
                            </span>
                            <button
                              onClick={() => removeSet(s.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {historyExercise === p.exerciseName && historyData.length > 0 && (
                      <div className="mt-3 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historyData}>
                            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                            <Line type="monotone" dataKey="weightKg" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <ProgrammedAdder onAdd={addProgrammed} />
        </Card>
      )}
    </div>
  );
}

function SetLogger({
  exerciseName,
  nextSet,
  defaultWeight,
  defaultReps,
  onLog,
}: {
  exerciseName: string;
  nextSet: number;
  defaultWeight: number | null;
  defaultReps: number;
  onLog: (weightKg: number | null, reps: number | null) => void;
}) {
  const [w, setW] = useState(defaultWeight != null ? String(defaultWeight) : "");
  const [r, setR] = useState(String(defaultReps));
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Set {nextSet}</span>
      <Input
        className="h-8 w-20"
        placeholder="kg"
        type="number"
        step="0.5"
        value={w}
        onChange={(e) => setW(e.target.value)}
      />
      <span className="text-xs">×</span>
      <Input
        className="h-8 w-20"
        placeholder="reps"
        type="number"
        value={r}
        onChange={(e) => setR(e.target.value)}
      />
      <Button
        size="sm"
        onClick={() => {
          onLog(w === "" ? null : parseFloat(w), r === "" ? null : parseInt(r, 10));
        }}
      >
        Log
      </Button>
      <span className="sr-only">{exerciseName}</span>
    </div>
  );
}

function ProgrammedAdder({
  onAdd,
}: {
  onAdd: (form: {
    exerciseName: string;
    targetSets: number;
    targetReps: number;
    targetWeightKg: number | null;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8");
  const [weight, setWeight] = useState("");

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" /> Add exercise
      </Button>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
      <div>
        <Label>Exercise</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bench press" />
      </div>
      <div>
        <Label>Sets</Label>
        <Input value={sets} onChange={(e) => setSets(e.target.value)} type="number" />
      </div>
      <div>
        <Label>Reps</Label>
        <Input value={reps} onChange={(e) => setReps(e.target.value)} type="number" />
      </div>
      <div>
        <Label>Weight (kg)</Label>
        <Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.5" />
      </div>
      <div className="flex items-end gap-1">
        <Button
          size="sm"
          onClick={() => {
            if (!name.trim()) return;
            onAdd({
              exerciseName: name.trim(),
              targetSets: parseInt(sets, 10) || 3,
              targetReps: parseInt(reps, 10) || 8,
              targetWeightKg: weight === "" ? null : parseFloat(weight),
            });
            setName("");
            setWeight("");
            setOpen(false);
          }}
        >
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
