export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtMoney(n: number, currency = "CAD"): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function fmtKg(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function fmtRelative(ts: number): string {
  const now = Date.now();
  const diff = Math.round((ts - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 60) return diff < 0 ? "just now" : "in a moment";
  if (abs < 3600) {
    const m = Math.round(abs / 60);
    return diff < 0 ? `${m}m ago` : `in ${m}m`;
  }
  if (abs < 86400) {
    const h = Math.round(abs / 3600);
    return diff < 0 ? `${h}h ago` : `in ${h}h`;
  }
  const d = Math.round(abs / 86400);
  return diff < 0 ? `${d}d ago` : `in ${d}d`;
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function previousMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
