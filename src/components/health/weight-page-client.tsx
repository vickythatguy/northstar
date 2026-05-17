"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardKicker } from "@/components/ui/card";
import { fmtKg, todayISO } from "@/lib/format";

type Log = { id: string; date: string; weightKg: number; note: string | null; createdAt: number };

const RANGES = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
] as const;

export function WeightPageClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState<number>(90);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/weight");
    if (!res.ok) return;
    const data = (await res.json()) as { logs: Log[] };
    setLogs(data.logs);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    return logs.filter((l) => new Date(l.date + "T00:00:00").getTime() >= cutoff);
  }, [logs, days]);

  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const last7 = sorted.slice(-7);
    const avg7 = last7.reduce((s, l) => s + l.weightKg, 0) / last7.length;
    const start = sorted[0].weightKg;
    const latest = sorted[sorted.length - 1].weightKg;
    const change = latest - start;
    const last30 = sorted.slice(-30);
    const trend30 =
      last30.length >= 2 ? last30[last30.length - 1].weightKg - last30[0].weightKg : 0;
    return { avg7, change, trend30, latest };
  }, [logs]);

  async function save() {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, weightKg: w, note: note.trim() || undefined }),
    });
    setWeight("");
    setNote("");
    await refresh();
  }

  async function remove(id: string) {
    await fetch("/api/weight", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  return (
    <div className="space-y-8">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="78.4"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="…"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={save} disabled={!weight}>Log</Button>
          </div>
        </div>
      </Card>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Latest" value={fmtKg(stats.latest)} />
          <StatTile label="7-day avg" value={fmtKg(stats.avg7)} />
          <StatTile
            label="30-day trend"
            value={`${stats.trend30 > 0 ? "+" : ""}${stats.trend30.toFixed(1)} kg`}
          />
          <StatTile
            label="Since start"
            value={`${stats.change > 0 ? "+" : ""}${stats.change.toFixed(1)} kg`}
          />
        </div>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-lg">Trend</h3>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setDays(r.days)}
                className={`rounded px-2 py-1 text-xs ${
                  days === r.days ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No logs in this window yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filtered}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 font-serif text-lg">Recent logs</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {[...logs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 20)
              .map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-mono text-xs">{l.date}</span>
                  <span className="flex-1 px-4 text-muted-foreground">{l.note ?? ""}</span>
                  <span className="mr-3">{fmtKg(l.weightKg)}</span>
                  <button
                    onClick={() => remove(l.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <CardKicker>{label}</CardKicker>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </Card>
  );
}
