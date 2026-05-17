import { PageHeader } from "@/components/shell/page-header";
import { JournalPageClient } from "@/components/journal/journal-page-client";

export default function JournalPage() {
  return (
    <>
      <PageHeader kicker="journal" title="Think out loud.">
        Write or speak. Entries auto-file into categories. Sunday digest at week's end.
      </PageHeader>
      <JournalPageClient />
    </>
  );
}
