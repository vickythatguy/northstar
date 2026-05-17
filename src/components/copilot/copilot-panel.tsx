"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Sparkles, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useCopilot } from "@/stores/copilot-store";
import { PAGE_PROMPTS, type PageKey } from "@/lib/ai/prompts";
import { CopilotChat } from "./copilot-chat";
import { cn } from "@/lib/utils";

function pathnameToPageKey(pathname: string): PageKey {
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/budget")) return "budget";
  if (pathname.startsWith("/health/weight")) return "health.weight";
  if (pathname.startsWith("/health/food")) return "health.food";
  if (pathname.startsWith("/health/exercise")) return "health.exercise";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/settings")) return "settings";
  return "home";
}

export function CopilotPanel() {
  const pathname = usePathname();
  const pageKey = useMemo(() => pathnameToPageKey(pathname), [pathname]);
  const { open, setOpen } = useCopilot();
  const prompt = PAGE_PROMPTS[pageKey];

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-l border-border bg-paper/40 transition-[width] duration-200",
        open ? "w-[380px]" : "w-12",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        {open ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="font-serif text-base">Co-pilot</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Collapse co-pilot"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="mx-auto rounded p-1 text-muted-foreground hover:bg-secondary"
            aria-label="Expand co-pilot"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <CopilotChat pageKey={pageKey} placeholder={prompt.placeholder} seed={prompt.seed} />
      )}
    </aside>
  );
}
