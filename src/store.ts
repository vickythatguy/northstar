import { create } from 'zustand';
import type { Idea } from './lib/types';
import { loadIdeas, saveIdea } from './lib/db';

/** Playful toon hull colours, assigned round-robin on boat creation. */
const HULL_COLORS = [
  '#ff6b6b',
  '#ff9f43',
  '#ee5a6f',
  '#a55eea',
  '#26de81',
  '#fc5c65',
  '#fd9644',
  '#2bcbba',
];

let colorCursor = 0;

export type SheetState =
  | { mode: 'closed' }
  | { mode: 'name'; position: [number, number, number] } // dropping a new boat
  | { mode: 'idea'; ideaId: string }; // viewing an existing idea

interface Focus {
  ideaId: string | null; // null = surface / full-planet view
  nonce: number; // bump to re-trigger a fly-to even for the same idea
}

interface DriftState {
  ideas: Idea[];
  loaded: boolean;
  sheet: SheetState;
  focus: Focus;
  /** Bumped when the (canvas-occluded) sun is poked; SunCharacter reacts. */
  sunPoke: number;

  loadFromDb: () => Promise<void>;
  pokeSun: () => void;

  // Sheet flow
  openNameSheet: (position: [number, number, number]) => void;
  openIdeaSheet: (ideaId: string) => void;
  closeSheet: () => void;

  // Mutations (all persisted to Dexie)
  createIdea: (name: string) => void;
  addThought: (ideaId: string, text: string) => void;

  // Camera intent
  focusIdea: (ideaId: string) => void;
  surface: () => void;
}

export const useDriftStore = create<DriftState>((set, get) => ({
  ideas: [],
  loaded: false,
  sheet: { mode: 'closed' },
  focus: { ideaId: null, nonce: 0 },
  sunPoke: 0,

  async loadFromDb() {
    const ideas = await loadIdeas();
    colorCursor = ideas.length;
    set({ ideas, loaded: true });
  },

  pokeSun() {
    set((s) => ({ sunPoke: s.sunPoke + 1 }));
  },

  openNameSheet(position) {
    set({ sheet: { mode: 'name', position } });
  },

  openIdeaSheet(ideaId) {
    set({ sheet: { mode: 'idea', ideaId } });
  },

  closeSheet() {
    set({ sheet: { mode: 'closed' } });
  },

  createIdea(name) {
    const { sheet } = get();
    if (sheet.mode !== 'name') return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const idea: Idea = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idea_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: trimmed,
      thoughts: [],
      position: sheet.position,
      color: HULL_COLORS[colorCursor++ % HULL_COLORS.length],
      createdAt: Date.now(),
    };

    set((s) => ({ ideas: [...s.ideas, idea], sheet: { mode: 'closed' } }));
    void saveIdea(idea);
    // Sail the camera over to the new boat.
    get().focusIdea(idea.id);
  },

  addThought(ideaId, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    let updated: Idea | undefined;
    set((s) => ({
      ideas: s.ideas.map((idea) => {
        if (idea.id !== ideaId) return idea;
        updated = {
          ...idea,
          thoughts: [...idea.thoughts, { text: trimmed, createdAt: Date.now() }],
        };
        return updated;
      }),
    }));
    if (updated) void saveIdea(updated);
  },

  focusIdea(ideaId) {
    set((s) => ({ focus: { ideaId, nonce: s.focus.nonce + 1 } }));
  },

  surface() {
    set((s) => ({ focus: { ideaId: null, nonce: s.focus.nonce + 1 } }));
  },
}));
