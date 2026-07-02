import { useDriftStore } from '../store';

/**
 * Horizontal shelf of idea chips along the bottom. Tapping a chip flies the
 * planet so that idea faces front and zooms in (see PlanetController fly-to).
 */
export default function IdeaShelf() {
  const ideas = useDriftStore((s) => s.ideas);
  const focusIdea = useDriftStore((s) => s.focusIdea);
  const focus = useDriftStore((s) => s.focus);
  const sheetOpen = useDriftStore((s) => s.sheet.mode !== 'closed');

  if (ideas.length === 0 || sheetOpen) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-4">
      <div className="pointer-events-auto flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ideas.map((idea) => {
          const active = focus.ideaId === idea.id;
          return (
            <button
              key={idea.id}
              onClick={() => focusIdea(idea.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-md backdrop-blur transition ${
                active ? 'bg-sky-500 text-white' : 'bg-white/90 text-sky-700'
              }`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: idea.color }}
              />
              {idea.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
