import { PageHeader } from "@/components/shell/page-header";

export default function JournalPage() {
  return (
    <>
      <PageHeader kicker="journal" title="Think out loud.">
        Write or speak. Auto-filed into categories. Sunday digest at week's end.
      </PageHeader>
      <section className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
        Composer + categorized entries — wired in step 3.
      </section>
    </>
  );
}
