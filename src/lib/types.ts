export interface Thought {
  text: string;
  createdAt: number;
}

export interface Idea {
  id: string;
  name: string;
  thoughts: Thought[];
  /** Point on the unit sphere (local planet space) — rotates with the planet. */
  position: [number, number, number];
  /** Hull colour, chosen at creation for a bit of variety. */
  color: string;
  createdAt: number;
}
