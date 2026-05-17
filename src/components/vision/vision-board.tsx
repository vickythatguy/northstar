"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, Plus, GripVertical, Check, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Goal = {
  id: string;
  title: string;
  reason: string | null;
  imageUrl: string | null;
  targetDate: number | null;
  status: "active" | "done" | "parked";
  sortOrder: number;
};

export function VisionBoard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [adding, setAdding] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/goals");
    if (!res.ok) return;
    const data = (await res.json()) as { goals: Goal[] };
    setGoals(data.goals);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function patch(id: string, body: Partial<Goal>) {
    setGoals((cur) => cur.map((g) => (g.id === id ? { ...g, ...body } : g)));
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
  }

  async function remove(id: string) {
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  async function reorder(ids: string[]) {
    setGoals((cur) => {
      const m = new Map(cur.map((g) => [g.id, g]));
      return ids.map((id, i) => ({ ...(m.get(id) as Goal), sortOrder: i }));
    });
    await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  }

  function onDrop(targetId: string) {
    if (!dragging || dragging === targetId) return;
    const order = goals.map((g) => g.id);
    const from = order.indexOf(dragging);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    order.splice(to, 0, order.splice(from, 1)[0]);
    reorder(order);
    setDragging(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Goals · drag to reorder</p>
        <Button size="sm" variant="ghost" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-3 w-3" /> New goal
        </Button>
      </div>

      {adding && <GoalForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />}

      {goals.length === 0 && !adding ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">Your board is empty. Click "New goal" to seed it.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {goals.map((g) => (
            <article
              key={g.id}
              draggable
              onDragStart={() => setDragging(g.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(g.id)}
              onDragEnd={() => setDragging(null)}
              className={cn(
                "group relative rounded-lg border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm",
                dragging === g.id && "opacity-50",
                g.status === "done" && "opacity-70",
                g.status === "parked" && "opacity-50 grayscale",
              )}
            >
              {g.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.imageUrl}
                  alt=""
                  className="h-32 w-full object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              )}
              <div className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="font-serif text-lg leading-tight">{g.title}</h3>
                  <span className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100">
                    <GripVertical className="h-4 w-4" />
                  </span>
                </div>
                {g.reason && <p className="mt-1 text-sm text-muted-foreground">{g.reason}</p>}
                {g.targetDate && (
                  <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    by {new Date(g.targetDate).toLocaleDateString("en-CA", { dateStyle: "medium" })}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1 text-xs">
                  <button
                    onClick={() => patch(g.id, { status: g.status === "done" ? "active" : "done" })}
                    className="rounded px-2 py-1 hover:bg-secondary"
                    title="Toggle done"
                  >
                    {g.status === "done" ? <Check className="h-3 w-3 text-accent" /> : <Check className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => patch(g.id, { status: g.status === "parked" ? "active" : "parked" })}
                    className="rounded px-2 py-1 hover:bg-secondary"
                    title="Toggle parked"
                  >
                    {g.status === "parked" ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  </button>
                  <span className="ml-1 text-muted-foreground capitalize">{g.status}</span>
                  <button
                    onClick={() => remove(g.id)}
                    className="ml-auto rounded px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetDate, setTargetDate] = useState("");
  return (
    <Card className="mb-4 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Run a half marathon" />
        </div>
        <div className="sm:col-span-2">
          <Label>Why it matters</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="One line." />
        </div>
        <div>
          <Label>Image URL (optional)</Label>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label>Target date (optional)</Label>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          disabled={!title.trim()}
          onClick={async () => {
            const res = await fetch("/api/goals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: title.trim(),
                reason: reason.trim() || null,
                imageUrl: imageUrl.trim() || null,
                targetDate: targetDate || null,
              }),
            });
            if (res.ok) onSaved();
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}
