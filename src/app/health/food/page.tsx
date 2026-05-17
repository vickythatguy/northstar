import { PageHeader } from "@/components/shell/page-header";
import { FoodPageClient } from "@/components/health/food-page-client";

export default function FoodPage() {
  return (
    <>
      <PageHeader kicker="health · food" title="What you ate.">
        Paste-to-parse and CSV. Phone-app integration once you pick one.
      </PageHeader>
      <FoodPageClient />
    </>
  );
}
