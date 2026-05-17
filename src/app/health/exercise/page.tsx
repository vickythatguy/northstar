import { PageHeader } from "@/components/shell/page-header";
import { ExercisePageClient } from "@/components/health/exercise-page-client";

export default function ExercisePage() {
  return (
    <>
      <PageHeader kicker="health · exercise" title="Today, on the floor.">
        Split picker, today's checklist, per-exercise history. Coach lives in the right margin.
      </PageHeader>
      <ExercisePageClient />
    </>
  );
}
