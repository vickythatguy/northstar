import { useState } from 'react';
import { useDriftStore } from '../store';
import { nudgeZoom } from '../lib/controls';
import { audioPrefs } from '../lib/sound';

/** On-screen fallback controls: zoom +/−, return-to-surface, and sound toggle. */
export default function Controls() {
  const surface = useDriftStore((s) => s.surface);
  const focused = useDriftStore((s) => s.focus.ideaId !== null);
  const [soundOn, setSoundOn] = useState(audioPrefs.on);

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-sky-700 shadow-md backdrop-blur active:scale-90 transition';

  return (
    <>
      {/* Sound toggle, top-right */}
      <button
        aria-label="Toggle sound"
        className={`absolute right-4 top-4 z-20 ${btn}`}
        onClick={() => {
          audioPrefs.on = !audioPrefs.on;
          setSoundOn(audioPrefs.on);
        }}
      >
        {soundOn ? '🔊' : '🔈'}
      </button>

      {/* Zoom + surface, right edge */}
      <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
        <button aria-label="Zoom in" className={btn} onClick={() => nudgeZoom(-0.5)}>
          +
        </button>
        <button aria-label="Zoom out" className={btn} onClick={() => nudgeZoom(0.5)}>
          −
        </button>
        {focused && (
          <button
            aria-label="Back to surface"
            className={`${btn} !w-11 !text-xs`}
            onClick={surface}
          >
            🌊
          </button>
        )}
      </div>
    </>
  );
}
