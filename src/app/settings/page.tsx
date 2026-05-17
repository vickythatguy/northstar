import { PageHeader } from "@/components/shell/page-header";
import { SettingsPageClient } from "@/components/settings/settings-page-client";

export default function SettingsPage() {
  return (
    <>
      <PageHeader kicker="settings" title="The dials.">
        Keys, data, and the small print.
      </PageHeader>
      <SettingsPageClient />
    </>
  );
}
