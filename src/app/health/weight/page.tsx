import { PageHeader } from "@/components/shell/page-header";

export default function WeightPage() {
  return (
    <>
      <PageHeader kicker="health · weight" title="The slow line.">
        Daily logs, weekly averages, 90-day trend.
      </PageHeader>
      <section className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
        Chart + log-weight input — wired in step 5.
      </section>
    </>
  );
}
