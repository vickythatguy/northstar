import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDriftStore } from '../store';

/**
 * Bottom sheet with two modes:
 *  - "name": name a freshly dropped boat.
 *  - "idea": read an idea's thoughts and feed it a new one (grows the boat).
 */
export default function IdeaSheet() {
  const sheet = useDriftStore((s) => s.sheet);
  const ideas = useDriftStore((s) => s.ideas);
  const closeSheet = useDriftStore((s) => s.closeSheet);
  const createIdea = useDriftStore((s) => s.createIdea);
  const addThought = useDriftStore((s) => s.addThought);

  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const open = sheet.mode !== 'closed';
  const idea = sheet.mode === 'idea' ? ideas.find((i) => i.id === sheet.ideaId) : undefined;

  // Reset the draft and focus the field whenever the sheet (re)opens.
  useEffect(() => {
    if (!open) return;
    setDraft('');
    const t = setTimeout(() => inputRef.current?.focus(), 260);
    return () => clearTimeout(t);
  }, [open, sheet.mode, sheet.mode === 'idea' ? sheet.ideaId : null]);

  const submit = () => {
    if (sheet.mode === 'name') createIdea(draft);
    else if (sheet.mode === 'idea' && idea) {
      addThought(idea.id, draft);
      setDraft('');
      inputRef.current?.focus();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-30 bg-slate-900/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSheet}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-3xl bg-white/95 p-5 pb-8 shadow-2xl backdrop-blur"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

            {sheet.mode === 'name' && (
              <div>
                <h2 className="mb-1 text-xl font-bold text-sky-800">Name your boat</h2>
                <p className="mb-4 text-sm text-slate-500">
                  A little sailboat for a half-formed idea.
                </p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="e.g. Learn to sail"
                    className="flex-1 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-slate-700 outline-none focus:border-sky-300"
                  />
                  <button
                    onClick={submit}
                    disabled={!draft.trim()}
                    className="rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white shadow disabled:opacity-40"
                  >
                    Set sail
                  </button>
                </div>
              </div>
            )}

            {sheet.mode === 'idea' && idea && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ background: idea.color }}
                  />
                  <h2 className="text-xl font-bold text-sky-800">{idea.name}</h2>
                </div>
                <p className="mb-3 text-sm text-slate-500">
                  {idea.thoughts.length === 0
                    ? 'No thoughts yet — feed it one.'
                    : `${idea.thoughts.length} thought${idea.thoughts.length > 1 ? 's' : ''} · it grows as you add more`}
                </p>

                <div className="mb-4 max-h-52 space-y-2 overflow-y-auto pr-1">
                  {[...idea.thoughts]
                    .reverse()
                    .map((t) => (
                      <div
                        key={t.createdAt}
                        className="rounded-2xl bg-sky-50 px-4 py-2 text-slate-700"
                      >
                        {t.text}
                      </div>
                    ))}
                </div>

                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="Add a thought…"
                    className="flex-1 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-slate-700 outline-none focus:border-sky-300"
                  />
                  <button
                    onClick={submit}
                    disabled={!draft.trim()}
                    className="rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white shadow disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
