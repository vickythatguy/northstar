"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardKicker } from "@/components/ui/card";
import { parseCSV } from "@/lib/csv";
import { todayISO } from "@/lib/format";

type FoodLog = {
  id: string;
  date: string;
  item: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: string | null;
};

export function FoodPageClient() {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => todayISO(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/food");
    if (!res.ok) return;
    const data = (await res.json()) as { logs: FoodLog[] };
    setLogs(data.logs ?? []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const todayLogs = useMemo(() => logs.filter((l) => l.date === today), [logs, today]);
  const todayTotals = useMemo(
    () =>
      todayLogs.reduce(
        (acc, l) => ({
          calories: acc.calories + l.calories,
          protein: acc.protein + l.proteinG,
          carbs: acc.carbs + l.carbsG,
          fat: acc.fat + l.fatG,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [todayLogs],
  );

  const weekly = useMemo(() => {
    const days: string[] = [];
    const d = new Date();
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(d);
      dd.setDate(d.getDate() - i);
      days.push(
        `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`,
      );
    }
    return days.map((iso) => {
      const day = logs.filter((l) => l.date === iso);
      return {
        date: iso.slice(5),
        calories: day.reduce((s, l) => s + l.calories, 0),
        protein: day.reduce((s, l) => s + l.proteinG, 0),
      };
    });
  }, [logs]);

  async function parsePaste() {
    if (!pasteText.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/food/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, text: pasteText }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? `Parse failed (${res.status})`);
        return;
      }
      setPasteText("");
      await refresh();
    } finally {
      setParsing(false);
    }
  }

  async function remove(id: string) {
    await fetch("/api/food", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  async function handleCSV(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const grid = parseCSV(text);
      if (grid.length < 2) return;
      const header = grid[0].map((h) => h.toLowerCase().trim());
      const ix = (...names: string[]) =>
        header.findIndex((h) => names.some((n) => h.includes(n)));
      const dateIdx = ix("date");
      const itemIdx = ix("food", "item", "name");
      const calIdx = ix("calorie", "kcal", "energy");
      const protIdx = ix("protein");
      const carbIdx = ix("carb");
      const fatIdx = ix("fat");
      if (dateIdx === -1 || itemIdx === -1) {
        setError("CSV needs at least date + food columns.");
        return;
      }
      for (const r of grid.slice(1)) {
        const date = r[dateIdx]?.trim();
        const item = r[itemIdx]?.trim();
        if (!date || !item) continue;
        await fetch("/api/food", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: normalizeISO(date),
            item,
            calories: parseFloat(r[calIdx] ?? "") || 0,
            protein_g: parseFloat(r[protIdx] ?? "") || 0,
            carbs_g: parseFloat(r[carbIdx] ?? "") || 0,
            fat_g: parseFloat(r[fatIdx] ?? "") || 0,
            source: "csv",
          }),
        });
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV failed.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Today · kcal" value={todayTotals.calories.toFixed(0)} />
        <Tile label="Protein" value={`${todayTotals.protein.toFixed(0)} g`} />
        <Tile label="Carbs" value={`${todayTotals.carbs.toFixed(0)} g`} />
        <Tile label="Fat" value={`${todayTotals.fat.toFixed(0)} g`} />
      </section>

      <Card className="p-4">
        <h3 className="mb-3 font-serif text-lg">Paste today's log</h3>
        <Textarea
          rows={4}
          placeholder="200g chicken, 1 cup rice, an apple, two coffees with milk…"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Claude parses it into rows. Macros estimated when not stated.
          </span>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCSV(f);
              }}
            />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3 w-3" /> CSV
            </Button>
            <Button size="sm" onClick={parsePaste} disabled={!pasteText.trim() || parsing}>
              <Sparkles className="h-3 w-3" /> {parsing ? "Parsing…" : "Parse"}
            </Button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 font-serif text-lg">Today</h3>
        {todayLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged today yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">kcal</th>
                <th className="py-2 text-right">P</th>
                <th className="py-2 text-right">C</th>
                <th className="py-2 text-right">F</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {todayLogs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-2">{l.item}</td>
                  <td className="py-2 text-right font-mono">{l.calories.toFixed(0)}</td>
                  <td className="py-2 text-right font-mono">{l.proteinG.toFixed(0)}</td>
                  <td className="py-2 text-right font-mono">{l.carbsG.toFixed(0)}</td>
                  <td className="py-2 text-right font-mono">{l.fatG.toFixed(0)}</td>
                  <td className="py-2 pl-2 text-right">
                    <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 font-serif text-lg">Last 7 days</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="calories" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <CardKicker>{label}</CardKicker>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </Card>
  );
}

function normalizeISO(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return todayISO();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
