import { PageHeader } from "@/components/shell/page-header";
import { WeightPageClient } from "@/components/health/weight-page-client";

export default function WeightPage() {
  return (
    <>
      <PageHeader kicker="health · weight" title="The slow line.">
        Daily logs, weekly average, trend over the last 30/90/365 days.
      </PageHeader>
      <WeightPageClient />
    </>
  );
}
