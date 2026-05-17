import { PageHeader } from "@/components/shell/page-header";

export default function FoodPage() {
  return (
    <>
      <PageHeader kicker="health · food" title="What you ate.">
        Paste-to-parse and CSV first. Phone-app integration once you pick one.
      </PageHeader>
      <section className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
        Today's totals + weekly macros — wired in step 9.
      </section>
    </>
  );
}
