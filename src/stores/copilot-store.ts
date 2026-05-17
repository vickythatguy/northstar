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
  loadedPages: Set<string>;
  setPageMessages: (page: string, msgs: CopilotMessage[]) => void;
  appendMessage: (page: string, msg: CopilotMessage) => void;
  patchMessage: (
    page: string,
    id: string,
    patch: Partial<CopilotMessage>,
  ) => void;
  clearPage: (page: string) => void;
};

export const useCopilot = create<CopilotState>((set) => ({
  open: true,
  setOpen: (open) => set({ open }),
  threadsByPage: {},
  loadedPages: new Set(),
  setPageMessages: (page, msgs) =>
    set((s) => {
      const loaded = new Set(s.loadedPages);
      loaded.add(page);
      return {
        threadsByPage: { ...s.threadsByPage, [page]: msgs },
        loadedPages: loaded,
      };
    }),
  appendMessage: (page, msg) =>
    set((s) => ({
      threadsByPage: {
        ...s.threadsByPage,
        [page]: [...(s.threadsByPage[page] ?? []), msg],
      },
    })),
  patchMessage: (page, id, patch) =>
    set((s) => ({
      threadsByPage: {
        ...s.threadsByPage,
        [page]: (s.threadsByPage[page] ?? []).map((m) =>
          m.id === id ? { ...m, ...patch } : m,
        ),
      },
    })),
  clearPage: (page) =>
    set((s) => {
      const next = { ...s.threadsByPage };
      delete next[page];
      return { threadsByPage: next };
    }),
}));
