"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { useCopilot, type CopilotMessage } from "@/stores/copilot-store";
import { cn } from "@/lib/utils";
import type { PageKey } from "@/lib/ai/prompts";

type Props = {
  pageKey: PageKey;
  placeholder: string;
  seed: string;
};

export function CopilotChat({ pageKey, placeholder, seed }: Props) {
  const messages = useCopilot((s) => s.threadsByPage[pageKey] ?? []);
  const append = useCopilot((s) => s.appendMessage);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    append(pageKey, userMsg);
    setInput("");
    setPending(true);

    // Mocked response. Step 2 of the build order replaces this with /api/chat.
    setTimeout(() => {
      append(pageKey, {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "(Co-pilot not wired yet — step 2 of the build order adds the Anthropic call. " +
          "For now I'm just here to hold the shape of the conversation.)",
        createdAt: Date.now(),
      });
      setPending(false);
    }, 400);
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
          <Bubble key={m.id} msg={m} />
        ))}

        {pending && (
          <div className="text-xs text-muted-foreground">thinking…</div>
        )}
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
          <button
            type="button"
            title="Voice input (wired in step 4)"
            disabled
            className="rounded p-1 text-muted-foreground/50"
          >
            <Mic className="h-4 w-4" />
          </button>
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

function Bubble({ msg }: { msg: CopilotMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-foreground text-background"
            : "bg-secondary text-foreground",
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}
