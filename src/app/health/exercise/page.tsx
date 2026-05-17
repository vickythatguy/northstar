import { PageHeader } from "@/components/shell/page-header";

export default function ExercisePage() {
  return (
    <>
      <PageHeader kicker="health · exercise" title="Today, on the floor.">
        Split picker, today's checklist, coach mode in the right margin.
      </PageHeader>
      <section className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
        Split + today's session + history — wired in step 6.
      </section>
    </>
  );
}
