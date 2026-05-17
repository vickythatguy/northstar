import { PageHeader } from "@/components/shell/page-header";

const groups = [
  {
    title: "API keys",
    items: [
      { name: "ANTHROPIC_API_KEY", purpose: "Co-pilot + categorization" },
      { name: "OPENAI_API_KEY", purpose: "Whisper voice + embeddings" },
      { name: "PLAID_CLIENT_ID / SECRET", purpose: "Bank + brokerage sync" },
    ],
  },
  {
    title: "Data",
    items: [
      { name: "Export everything", purpose: "JSON + CSVs" },
      { name: "Wipe", purpose: "Drop the local database" },
    ],
  },
  {
    title: "Co-pilot",
    items: [
      { name: "Tone", purpose: "concise · coach · reflective" },
      { name: "Default model", purpose: "claude-sonnet-4-6" },
      { name: "Max tokens", purpose: "per turn" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader kicker="settings" title="The dials.">
        Keys, data, and how the co-pilot speaks.
      </PageHeader>
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 font-serif text-xl">{g.title}</h2>
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {g.items.map((i) => (
                <li key={i.name} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-mono text-xs">{i.name}</span>
                  <span className="text-muted-foreground">{i.purpose}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
