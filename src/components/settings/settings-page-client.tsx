"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardKicker } from "@/components/ui/card";

type Status = {
  anthropic: boolean;
  openai: boolean;
  plaid: boolean;
  plaidEnv: string | null;
  copilotModel: string;
  categorizeModel: string;
};

export function SettingsPageClient() {
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/status");
    if (!res.ok) return;
    setStatus(await res.json());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <h2 className="mb-3 font-serif text-xl">API keys</h2>
        <ul className="divide-y divide-border">
          <KeyRow
            name="ANTHROPIC_API_KEY"
            present={status?.anthropic ?? false}
            purpose="Co-pilot + auto-categorization"
            extra={status ? `Model: ${status.copilotModel}` : undefined}
          />
          <KeyRow
            name="OPENAI_API_KEY"
            present={status?.openai ?? false}
            purpose="Whisper voice input + semantic search"
          />
          <KeyRow
            name="PLAID_CLIENT_ID / SECRET"
            present={status?.plaid ?? false}
            purpose={
              status?.plaid
                ? `Configured (${status.plaidEnv ?? "sandbox"}) — Link UI pending`
                : "Manual + CSV until set"
            }
            warning={!status?.plaid}
          />
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Add keys to <code className="font-mono">.env.local</code> and restart the dev server.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-serif text-xl">Data</h2>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/api/export" download>
            <Button variant="outline" size="sm">
              <Download className="h-3 w-3" /> Export everything (JSON)
            </Button>
          </a>
          <span className="text-xs text-muted-foreground">
            Goals · journal · health · workouts · transactions · budgets.
          </span>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-serif text-xl">Wealthsimple note</h2>
        <p className="text-sm text-muted-foreground">
          Cash accounts route through Plaid in Canada. For Invest/Trade there is no
          public retail API — log positions manually or paste a screenshot into the
          co-pilot for OCR. This page updates the moment that changes.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-serif text-xl">About</h2>
        <p className="text-sm text-muted-foreground">
          northstar v0.1 · single-user · local-first · all data lives in
          <code className="ml-1 font-mono">./northstar.db</code>.
        </p>
      </Card>
    </div>
  );
}

function KeyRow({
  name,
  present,
  purpose,
  extra,
  warning,
}: {
  name: string;
  present: boolean;
  purpose: string;
  extra?: string;
  warning?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-mono text-xs">{name}</p>
        <p className="text-xs text-muted-foreground">{purpose}</p>
        {extra && <p className="text-[11px] text-muted-foreground">{extra}</p>}
      </div>
      {present ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
          <Check className="h-3 w-3" /> set
        </span>
      ) : warning ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          <AlertCircle className="h-3 w-3" /> optional
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          <X className="h-3 w-3" /> missing
        </span>
      )}
    </li>
  );
}
