import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Sky from './components/Sky';
import SunCharacter from './components/SunCharacter';
import Scene from './components/Scene';
import Controls from './components/Controls';
import IdeaShelf from './components/IdeaShelf';
import IdeaSheet from './components/IdeaSheet';
import { useDriftStore } from './store';
import { CAMERA_FOV, FAR_DIST, pointer } from './lib/controls';
import { sunGeometry } from './lib/sunLayout';

export default function App() {
  const loadFromDb = useDriftStore((s) => s.loadFromDb);
  const pokeSun = useDriftStore((s) => s.pokeSun);
  const loaded = useDriftStore((s) => s.loaded);
  const hasIdeas = useDriftStore((s) => s.ideas.length > 0);

  useEffect(() => {
    void loadFromDb();
  }, [loadFromDb]);

  // Taps that miss the planet/boats: if they land on the sun peeking out from
  // behind the (transparent) canvas, poke it.
  const onPointerMissed = (e: MouseEvent) => {
    if (pointer.moved) return;
    const { cx, cy, r } = sunGeometry(window.innerWidth, window.innerHeight);
    if (Math.hypot(e.clientX - cx, e.clientY - cy) < r) pokeSun();
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Sky />
      <SunCharacter />

      {/* Transparent 3D layer on top; the opaque planet occludes the sun. */}
      <Canvas
        className="absolute inset-0"
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        camera={{ position: [0, 0, FAR_DIST], fov: CAMERA_FOV }}
        onPointerMissed={onPointerMissed}
      >
        <Scene />
      </Canvas>

      {/* Wordmark */}
      <div className="pointer-events-none absolute left-4 top-4 z-20">
        <div className="text-2xl font-extrabold text-white drop-shadow">Drift</div>
        <div className="text-xs font-semibold text-white/90 drop-shadow">
          a sea for half-formed ideas
        </div>
      </div>

      {/* First-run hint */}
      {loaded && !hasIdeas && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 text-center">
          <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-sky-700 shadow">
            Tap the water to drop an idea 🚣
          </span>
        </div>
      )}

      <Controls />
      <IdeaShelf />
      <IdeaSheet />
    </div>
  );
}
