"use client";

import { create } from "zustand";

export type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

type CopilotState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  threadsByPage: Record<string, CopilotMessage[]>;
  appendMessage: (page: string, msg: CopilotMessage) => void;
  clearPage: (page: string) => void;
};

export const useCopilot = create<CopilotState>((set) => ({
  open: true,
  setOpen: (open) => set({ open }),
  threadsByPage: {},
  appendMessage: (page, msg) =>
    set((s) => ({
      threadsByPage: {
        ...s.threadsByPage,
        [page]: [...(s.threadsByPage[page] ?? []), msg],
      },
    })),
  clearPage: (page) =>
    set((s) => {
      const next = { ...s.threadsByPage };
      delete next[page];
      return { threadsByPage: next };
    }),
}));
