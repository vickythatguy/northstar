import { PageHeader } from "@/components/shell/page-header";
import { BudgetPageClient } from "@/components/budget/budget-page-client";

export default function BudgetPage() {
  return (
    <>
      <PageHeader kicker="budget" title="Where the money went.">
        Accounts, transactions, categories. Plaid for the live ones, CSV import for the rest.
      </PageHeader>
      <BudgetPageClient />
    </>
  );
}
