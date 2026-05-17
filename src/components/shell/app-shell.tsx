import { LeftNav } from "./left-nav";
import { CopilotPanel } from "@/components/copilot/copilot-panel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <LeftNav />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-10 py-12">{children}</div>
      </main>
      <CopilotPanel />
    </div>
  );
}
