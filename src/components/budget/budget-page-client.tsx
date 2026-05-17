"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload, Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardKicker } from "@/components/ui/card";
import { TX_CATEGORIES } from "@/lib/categories";
import { parseCSV } from "@/lib/csv";
import { currentMonth, fmtMoney, previousMonth, todayISO } from "@/lib/format";

type Account = {
  id: string;
  name: string;
  type: string;
  source: string;
  balance: number;
  currency: string;
  lastSyncedAt: number | null;
};

type Tx = {
  id: string;
  accountId: string | null;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  source: string;
};

type Budget = { id: string; category: string; month: string; amount: number };

const CAT_PALETTE = [
  "#c47e4f",
  "#7a9b6c",
  "#9b87c4",
  "#c4a87a",
  "#7a98c4",
  "#6c7a8c",
  "#c46c8c",
  "#a8a8a8",
  "#b09a72",
  "#80a89e",
  "#a87a72",
  "#7d9a80",
];

export function BudgetPageClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tx, setTx] = useState<Tx[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [filter, setFilter] = useState("");
  const [addingTx, setAddingTx] = useState(false);
  const [addingAcct, setAddingAcct] = useState(false);
  const month = currentMonth();
  const last = previousMonth();

  const loadAll = useCallback(async () => {
    const [a, t, b] = await Promise.all([
      fetch("/api/budget/accounts").then((r) => r.json()),
      fetch("/api/budget/transactions").then((r) => r.json()),
      fetch(`/api/budget/budgets?month=${month}`).then((r) => r.json()),
    ]);
    setAccounts(a.accounts ?? []);
    setTx(t.transactions ?? []);
    setBudgets(b.budgets ?? []);
  }, [month]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const kpis = useMemo(() => {
    const mtd = tx.filter((t) => t.date.startsWith(month));
    const lmd = tx.filter((t) => t.date.startsWith(last));
    const spend = (rows: Tx[]) =>
      rows.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
    const income = (rows: Tx[]) => rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const spendM = spend(mtd);
    const incomeM = income(mtd);
    const spendL = spend(lmd);
    return {
      spend: spendM,
      income: incomeM,
      net: incomeM - spendM,
      delta: spendL === 0 ? 0 : ((spendM - spendL) / spendL) * 100,
    };
  }, [tx, month, last]);

  const byCategoryMonth = useMemo(() => {
    const mtd = tx.filter((t) => t.date.startsWith(month) && t.amount < 0);
    const m = new Map<string, number>();
    for (const t of mtd) {
      const c = t.category ?? "Other";
      m.set(c, (m.get(c) ?? 0) + Math.abs(t.amount));
    }
    return Array.from(m.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [tx, month]);

  const last6Months = useMemo(() => {
    const months: string[] = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const dd = new Date(d);
      dd.setMonth(d.getMonth() - i);
      months.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`);
    }
    const series: Record<string, number | string>[] = months.map((m) => ({ month: m.slice(2) }));
    const cats = new Set<string>();
    for (const t of tx) {
      if (t.amount >= 0) continue;
      const mIdx = months.indexOf(t.date.slice(0, 7));
      if (mIdx === -1) continue;
      const c = t.category ?? "Other";
      cats.add(c);
      const cur = (series[mIdx][c] as number) ?? 0;
      series[mIdx][c] = cur + Math.abs(t.amount);
    }
    return { series, cats: Array.from(cats).sort() };
  }, [tx]);

  const visibleTx = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return tx.slice(0, 200);
    return tx
      .filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.category ?? "").toLowerCase().includes(q),
      )
      .slice(0, 200);
  }, [tx, filter]);

  async function setCategory(id: string, category: string) {
    setTx((cur) => cur.map((t) => (t.id === id ? { ...t, category } : t)));
    await fetch("/api/budget/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, category }),
    });
  }

  async function removeTx(id: string) {
    await fetch("/api/budget/transactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadAll();
  }

  async function removeAccount(id: string) {
    await fetch("/api/budget/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadAll();
  }

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Spend MTD" value={fmtMoney(-kpis.spend)} />
        <Tile label="Income MTD" value={fmtMoney(kpis.income)} />
        <Tile label="Net MTD" value={fmtMoney(kpis.net)} />
        <Tile
          label="vs last month"
          value={kpis.delta === 0 ? "—" : `${kpis.delta > 0 ? "+" : ""}${kpis.delta.toFixed(0)}%`}
        />
      </section>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-lg">Accounts</h3>
          <Button variant="ghost" size="sm" onClick={() => setAddingAcct((v) => !v)}>
            <Plus className="h-3 w-3" /> Add manual
          </Button>
        </div>
        {addingAcct && <AccountAdder onDone={() => { setAddingAcct(false); loadAll(); }} />}
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet. Add one manually, or set Plaid keys in Settings.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.type} · {a.source}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{fmtMoney(a.balance, a.currency)}</span>
                  <button onClick={() => removeAccount(a.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-serif text-lg">This month by category</h3>
          {byCategoryMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No spend yet this month.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategoryMonth}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {byCategoryMonth.map((_, i) => (
                      <Cell key={i} fill={CAT_PALETTE[i % CAT_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: number) => fmtMoney(-v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-serif text-lg">Last 6 months</h3>
          {last6Months.cats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Import some transactions to see history.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last6Months.series}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  {last6Months.cats.map((c, i) => (
                    <Bar key={c} dataKey={c} stackId="a" fill={CAT_PALETTE[i % CAT_PALETTE.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <BudgetVsActual budgets={budgets} byCategoryMonth={byCategoryMonth} month={month} onChange={loadAll} />

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg">Transactions</h3>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter…"
              className="h-8 w-48"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <CSVImporter accountIdFallback={accounts[0]?.id ?? null} onDone={loadAll} />
            <Button size="sm" variant="ghost" onClick={() => setAddingTx((v) => !v)}>
              <Plus className="h-3 w-3" /> Manual
            </Button>
          </div>
        </div>

        {addingTx && <TxAdder accountIdFallback={accounts[0]?.id ?? null} onDone={() => { setAddingTx(false); loadAll(); }} />}

        {tx.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet. Import a CSV or add one manually.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleTx.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{t.date}</td>
                    <td className="py-2">{t.description}</td>
                    <td className="py-2">
                      <select
                        value={t.category ?? ""}
                        onChange={(e) => setCategory(t.id, e.target.value)}
                        className="rounded border border-border bg-card px-2 py-1 text-xs"
                      >
                        <option value="">—</option>
                        {TX_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`py-2 text-right font-mono ${t.amount < 0 ? "" : "text-accent"}`}>
                      {fmtMoney(t.amount)}
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <button onClick={() => removeTx(t.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

function AccountAdder({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("chequing");
  const [balance, setBalance] = useState("0");
  return (
    <div className="mb-3 grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Wealthsimple Cash" />
      </div>
      <div>
        <Label>Type</Label>
        <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          {["chequing", "savings", "credit", "investment", "cash"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Balance</Label>
        <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button
          size="sm"
          onClick={async () => {
            if (!name.trim()) return;
            await fetch("/api/budget/accounts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: name.trim(), type, balance: parseFloat(balance) || 0 }),
            });
            onDone();
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function TxAdder({ accountIdFallback, onDone }: { accountIdFallback: string | null; onDone: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <div className="mb-3 grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_2fr_1fr_auto]">
      <div>
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <Label>Description</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Loblaws" />
      </div>
      <div>
        <Label>Amount</Label>
        <Input type="number" step="0.01" placeholder="-42.18" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button
          size="sm"
          onClick={async () => {
            const a = parseFloat(amount);
            if (!desc.trim() || isNaN(a)) return;
            await fetch("/api/budget/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date,
                description: desc.trim(),
                amount: a,
                accountId: accountIdFallback,
              }),
            });
            onDone();
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function CSVImporter({ accountIdFallback, onDone }: { accountIdFallback: string | null; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File) {
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      const grid = parseCSV(text);
      if (grid.length < 2) {
        setError("CSV is empty.");
        return;
      }
      const header = grid[0].map((h) => h.toLowerCase().trim());
      const dateIdx = header.findIndex((h) => h.includes("date"));
      const descIdx = header.findIndex((h) => h.includes("desc") || h.includes("merchant") || h.includes("payee") || h.includes("name"));
      const amountIdx = header.findIndex((h) => h === "amount" || h.includes("amount"));
      if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
        setError("Need columns: date, description, amount.");
        return;
      }
      const rows = grid.slice(1).map((r) => {
        const rawDate = r[dateIdx]?.trim();
        const iso = normalizeDate(rawDate);
        return {
          date: iso,
          description: (r[descIdx] ?? "").trim(),
          amount: parseFloat((r[amountIdx] ?? "").replace(/[^\d.-]/g, "")),
        };
      }).filter((r) => r.date && r.description && !isNaN(r.amount));

      if (rows.length === 0) {
        setError("No valid rows.");
        return;
      }

      const res = await fetch("/api/budget/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accountIdFallback, rows }),
      });
      if (!res.ok) {
        setError(`Import failed (${res.status}).`);
        return;
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
        }}
      />
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
        <Upload className="h-3 w-3" /> {busy ? "Importing…" : "Import CSV"}
      </Button>
      {error && <span className="text-xs text-destructive" title={error}>{error}</span>}
    </>
  );
}

function normalizeDate(s: string): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // try MM/DD/YYYY or DD/MM/YYYY — prefer MM/DD as US/CA default
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, mm, dd, yy] = m;
    if (yy.length === 2) yy = (parseInt(yy) > 50 ? "19" : "20") + yy;
    return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  return "";
}

function BudgetVsActual({
  budgets,
  byCategoryMonth,
  month,
  onChange,
}: {
  budgets: Budget[];
  byCategoryMonth: { category: string; amount: number }[];
  month: string;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [cat, setCat] = useState(TX_CATEGORIES[0]);
  const [amt, setAmt] = useState("");

  const merged = TX_CATEGORIES.filter((c) => c !== "Income" && c !== "Transfer").map((c) => {
    const b = budgets.find((x) => x.category === c)?.amount ?? 0;
    const a = byCategoryMonth.find((x) => x.category === c)?.amount ?? 0;
    return { category: c, budget: b, actual: a };
  }).filter((x) => x.budget > 0 || x.actual > 0);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-lg">Budgets vs actual · {month}</h3>
        <Button variant="ghost" size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-3 w-3" /> Set budget
        </Button>
      </div>
      {adding && (
        <div className="mb-3 grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[2fr_1fr_auto]">
          <div>
            <Label>Category</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={cat} onChange={(e) => setCat(e.target.value as typeof cat)}>
              {TX_CATEGORIES.filter((c) => c !== "Income" && c !== "Transfer").map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Monthly amount</Label>
            <Input type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              onClick={async () => {
                const a = parseFloat(amt);
                if (isNaN(a)) return;
                await fetch("/api/budget/budgets", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ category: cat, month, amount: a }),
                });
                setAdding(false);
                setAmt("");
                onChange();
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}
      {merged.length === 0 ? (
        <p className="text-sm text-muted-foreground">Set a budget to see progress here.</p>
      ) : (
        <ul className="space-y-2">
          {merged.map((m) => {
            const pct = m.budget > 0 ? Math.min(100, (m.actual / m.budget) * 100) : 0;
            const over = m.budget > 0 && m.actual > m.budget;
            return (
              <li key={m.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{m.category}</span>
                  <span className={`font-mono text-xs ${over ? "text-destructive" : "text-muted-foreground"}`}>
                    {fmtMoney(-m.actual)} / {m.budget > 0 ? fmtMoney(-m.budget) : "no budget"}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div
                    className={`h-2 rounded-full transition-all ${over ? "bg-destructive" : "bg-accent"}`}
                    style={{ width: `${m.budget > 0 ? pct : 0}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
