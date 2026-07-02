import Dexie, { type Table } from 'dexie';
import type { Idea } from './types';

/**
 * Dexie / IndexedDB persistence. A single `ideas` table keyed by id. The whole
 * `Idea` object (including its nested thoughts array and sphere position) is
 * stored as one record, so boats reappear exactly where they were left.
 */
class DriftDB extends Dexie {
  ideas!: Table<Idea, string>;

  constructor() {
    super('drift');
    this.version(1).stores({
      // Only `id` is indexed; everything else lives on the record.
      ideas: 'id, createdAt',
    });
  }
}

export const db = new DriftDB();

export async function loadIdeas(): Promise<Idea[]> {
  return db.ideas.orderBy('createdAt').toArray();
}

export async function saveIdea(idea: Idea): Promise<void> {
  await db.ideas.put(idea);
}

export async function deleteIdea(id: string): Promise<void> {
  await db.ideas.delete(id);
}
