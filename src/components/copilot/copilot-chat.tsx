"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useCopilot, type CopilotMessage } from "@/stores/copilot-store";
import { cn } from "@/lib/utils";
import type { PageKey } from "@/lib/ai/prompts";
import { VoiceButton } from "./voice-button";

type Props = {
  pageKey: PageKey;
  placeholder: string;
  seed: string;
  /** Optional structured context the page can inject into the system prompt. */
  context?: string;
};

export function CopilotChat({ pageKey, placeholder, seed, context }: Props) {
  const messages = useCopilot((s) => s.threadsByPage[pageKey] ?? []);
  const loaded = useCopilot((s) => s.loadedPages.has(pageKey));
  const setPageMessages = useCopilot((s) => s.setPageMessages);
  const append = useCopilot((s) => s.appendMessage);
  const patch = useCopilot((s) => s.patchMessage);

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history from the server once per page.
  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/chat?pageKey=${encodeURIComponent(pageKey)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { messages: CopilotMessage[] };
        if (!cancelled) setPageMessages(pageKey, data.messages);
      } catch {
        // Network errored — leave the store empty and let the user retry.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageKey, loaded, setPageMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, messages[messages.length - 1]?.content]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;

    append(pageKey, {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    });
    setInput("");
    setPending(true);

    const assistantPlaceholderId = crypto.randomUUID();
    append(pageKey, {
      id: assistantPlaceholderId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, message: text, context }),
      });

      if (!res.ok || !res.body) {
        patch(pageKey, assistantPlaceholderId, {
          content: `_(co-pilot unreachable: HTTP ${res.status})_`,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        patch(pageKey, assistantPlaceholderId, { content: acc });
      }
    } catch (err) {
      patch(pageKey, assistantPlaceholderId, {
        content: `_(co-pilot error: ${
          err instanceof Error ? err.message : String(err)
        })_`,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card/40 px-3 py-4 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">On this page</p>
            <p>{seed}</p>
          </div>
        ) : null}

        {messages.map((m) => (
          <Bubble key={m.id} msg={m} pending={pending} />
        ))}
      </div>

      <form
        className="border-t border-border bg-paper/60 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex items-end gap-2 rounded-lg border border-border bg-card px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="max-h-40 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <VoiceButton onTranscript={(t) => setInput((cur) => (cur ? cur + " " + t : t))} />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            className="rounded bg-foreground p-1.5 text-background disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ msg, pending }: { msg: CopilotMessage; pending: boolean }) {
  const isUser = msg.role === "user";
  const isStreamingEmpty = !isUser && pending && msg.content.length === 0;
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-foreground text-background"
            : "bg-secondary text-foreground",
        )}
      >
        {isStreamingEmpty ? (
          <span className="text-muted-foreground">thinking…</span>
        ) : (
          msg.content
        )}
      </div>
    </div>
  );
}
