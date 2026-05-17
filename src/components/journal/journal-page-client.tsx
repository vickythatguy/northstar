"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CATEGORY_COLORS, JOURNAL_CATEGORIES } from "@/lib/categories";
import { VoiceButton } from "@/components/copilot/voice-button";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  body: string;
  categories: string[];
  source: string | null;
  hasEmbedding?: boolean;
  createdAt: number;
  updatedAt: number;
};

type SearchHit = Entry & { score: number };

export function JournalPageClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
  const [searchMode, setSearchMode] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [digesting, setDigesting] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/journal");
    if (!res.ok) return;
    const data = (await res.json()) as { entries: Entry[]; counts: Record<string, number> };
    setEntries(data.entries);
    setCounts(data.counts);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const shown = useMemo(() => {
    if (searchHits) return searchHits as Entry[];
    if (!activeCategory) return entries;
    return entries.filter((e) => e.categories.includes(activeCategory));
  }, [entries, activeCategory, searchHits]);

  async function save() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setDraft("");
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch("/api/journal", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  async function runDigest() {
    if (digesting) return;
    setDigesting(true);
    try {
      const res = await fetch("/api/journal/digest", { method: "POST" });
      if (res.ok) await refresh();
    } finally {
      setDigesting(false);
    }
  }

  async function runSearch(q: string) {
    if (!q.trim()) {
      setSearchHits(null);
      setSearchMode("");
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/journal/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { mode: string; entries: SearchHit[] };
      setSearchHits(data.entries);
      setSearchMode(data.mode);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="grid grid-cols-[12rem_1fr] gap-8">
      <aside className="text-sm">
        <Label className="mb-2 block">Categories</Label>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => {
                setActiveCategory(null);
                setSearchHits(null);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1 text-left",
                !activeCategory && !searchHits ? "bg-secondary" : "hover:bg-secondary/60",
              )}
            >
              <span>All</span>
              <span className="text-xs text-muted-foreground">{entries.length}</span>
            </button>
          </li>
          {JOURNAL_CATEGORIES.map((c) => (
            <li key={c}>
              <button
                onClick={() => {
                  setActiveCategory(c);
                  setSearchHits(null);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1 text-left capitalize",
                  activeCategory === c ? "bg-secondary" : "hover:bg-secondary/60",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: CATEGORY_COLORS[c] }}
                  />
                  {c}
                </span>
                <span className="text-xs text-muted-foreground">{counts[c] ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0">
        <Card className="mb-6 p-4">
          <Textarea
            rows={4}
            placeholder="Write or speak. Auto-files itself."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">⌘/Ctrl+Enter to save · auto-categorized</span>
            <div className="flex items-center gap-2">
              <VoiceButton
                onTranscript={(t) => setDraft((d) => (d ? d + " " + t : t))}
              />
              <Button onClick={save} disabled={!draft.trim() || saving} size="sm">
                {saving ? "Saving…" : "Save entry"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search entries…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(query);
              }}
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => runSearch(query)} disabled={searching}>
            {searching ? "…" : "Search"}
          </Button>
          {searchHits && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchHits(null);
                setQuery("");
              }}
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={runDigest} disabled={digesting}>
            {digesting ? "Digesting…" : "Weekly digest"}
          </Button>
        </div>

        {searchHits && (
          <p className="mb-3 text-xs text-muted-foreground">
            {searchHits.length} result{searchHits.length === 1 ? "" : "s"} · {searchMode} search
          </p>
        )}

        <ul className="space-y-3">
          {shown.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {searchHits ? "No matches." : "No entries yet. Start writing."}
            </li>
          ) : (
            shown.map((e) => (
              <li key={e.id}>
                <Card className="p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {e.categories.map((c) => (
                        <span
                          key={c}
                          className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                          style={{
                            background: (CATEGORY_COLORS[c] ?? "#999") + "22",
                            color: CATEGORY_COLORS[c] ?? undefined,
                          }}
                        >
                          {c}
                        </span>
                      ))}
                      <span className="text-[11px] text-muted-foreground">
                        · {new Date(e.createdAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <button
                      onClick={() => remove(e.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{e.body}</p>
                </Card>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
