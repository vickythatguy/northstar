import { PageHeader } from "@/components/shell/page-header";

const kpis = [
  { label: "Spend MTD", value: "—" },
  { label: "Income MTD", value: "—" },
  { label: "Net MTD", value: "—" },
  { label: "vs last month", value: "—" },
];

export default function BudgetPage() {
  return (
    <>
      <PageHeader kicker="budget" title="Where the money went.">
        Accounts, transactions, categories. Plaid for the live ones; CSV for the rest.
      </PageHeader>

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-2 font-serif text-2xl">{k.value}</p>
          </div>
        ))}
      </section>

      <Placeholder section="Accounts" note="Plaid Link arrives in step 8." />
      <Placeholder section="Transactions" note="CSV import + auto-categorization in step 7." />
      <Placeholder section="Spend by category" />
      <Placeholder section="Budgets vs actual" />
    </>
  );
}

function Placeholder({ section, note }: { section: string; note?: string }) {
  return (
    <section className="mb-6 rounded-lg border border-dashed border-border bg-card/40 p-5">
      <h3 className="text-lg">{section}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {note ?? "Placeholder — wired in a later step."}
      </p>
    </section>
  );
}
