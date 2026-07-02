import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { prefersReducedMotion } from '../lib/motion';
import { playPop } from '../lib/sound';
import { useDriftStore } from '../store';
import { SUN_TOP_VH, SUN_SIZE_VW, SUN_SIZE_MAX } from '../lib/sunLayout';

type Expr = 'smile' | 'surprised' | 'giggly';

/**
 * The sun: a big googly smiley character (Vegas-Sphere / Minion energy) that
 * lives in the sky BEHIND the planet. Rendered as DOM on a layer beneath the
 * transparent R3F canvas, so the opaque globe occludes it and it peeks out.
 *
 * Idle: eyes follow the cursor/finger and it blinks on its own.
 * Poke: springy squish-and-bounce with a cycling playful reaction.
 */
export default function SunCharacter() {
  const rootRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const [expr, setExpr] = useState<Expr>('smile');
  const [blinking, setBlinking] = useState(false);
  const reactionIdx = useRef(0);
  // Poke is triggered from the canvas layer (the sun sits behind it), routed
  // through the store. See App's onPointerMissed.
  const sunPoke = useDriftStore((s) => s.sunPoke);
  const pokeRef = useRef<() => void>(() => {});

  // Pupil offset — spring-smoothed for a lively, watching feel.
  const px = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const py = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });

  // --- Eye tracking ---------------------------------------------------------
  useEffect(() => {
    if (prefersReducedMotion) return;
    const onMove = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.42; // eyes sit a bit above centre
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const len = Math.hypot(dx, dy) || 1;
      const max = 9; // px of travel
      px.set((dx / len) * Math.min(max, len / 12));
      py.set((dy / len) * Math.min(max, len / 12));
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [px, py]);

  // --- Auto-blink -----------------------------------------------------------
  useEffect(() => {
    if (prefersReducedMotion) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => setBlinking(false), 130);
        schedule();
      }, 2200 + Math.random() * 2600);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  // --- Poke: cycle through 2–3 Talking-Tom reactions ------------------------
  const poke = async () => {
    playPop();
    const which = reactionIdx.current % 3;
    reactionIdx.current += 1;

    if (prefersReducedMotion) {
      setExpr('giggly');
      await controls.start({ scale: [1, 1.04, 1], transition: { duration: 0.4 } });
      setExpr('smile');
      return;
    }

    if (which === 0) {
      // Squish-and-bounce
      setExpr('surprised');
      await controls.start({
        scaleX: [1, 1.28, 0.86, 1.08, 1],
        scaleY: [1, 0.74, 1.2, 0.96, 1],
        transition: { duration: 0.7, ease: 'easeOut' },
      });
    } else if (which === 1) {
      // Boing pop up
      setExpr('giggly');
      await controls.start({
        y: [0, -26, 0, -10, 0],
        scale: [1, 1.12, 0.94, 1.04, 1],
        transition: { duration: 0.75, ease: 'easeOut' },
      });
    } else {
      // Quick spin
      setExpr('giggly');
      await controls.start({
        rotate: [0, 18, -360],
        scale: [1, 1.1, 1],
        transition: { duration: 0.8, ease: 'easeInOut' },
      });
      controls.set({ rotate: 0 });
    }
    setExpr('smile');
  };

  // Keep the latest poke available to the store subscription, and fire it when
  // the canvas reports a poke (skipping the initial mount value).
  pokeRef.current = poke;
  const firstPoke = useRef(true);
  useEffect(() => {
    if (firstPoke.current) {
      firstPoke.current = false;
      return;
    }
    pokeRef.current();
  }, [sunPoke]);

  const eyeScaleY = blinking ? 0.1 : 1;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute left-1/2 -z-10 flex -translate-x-1/2 items-center justify-center"
      style={{
        top: `${SUN_TOP_VH * 100}vh`,
        width: `min(${SUN_SIZE_VW * 100}vw, ${SUN_SIZE_MAX}px)`,
        height: `min(${SUN_SIZE_VW * 100}vw, ${SUN_SIZE_MAX}px)`,
      }}
    >
      <motion.button
        type="button"
        aria-label="Poke the sun"
        onClick={poke}
        animate={controls}
        whileTap={{ scale: 0.94 }}
        className="pointer-events-auto relative h-full w-full rounded-full"
        style={{
          background: 'radial-gradient(circle at 38% 32%, #fff3a6, #ffd23f 55%, #ffb01f 100%)',
          boxShadow: '0 0 60px 18px rgba(255, 208, 63, 0.55)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {/* Rays */}
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{
              width: 14,
              height: '20%',
              marginLeft: -7,
              transformOrigin: '50% 0%',
              transform: `rotate(${i * 30}deg) translateY(48%)`,
              background: 'linear-gradient(#ffd23f, rgba(255,176,31,0.2))',
              borderRadius: 8,
              zIndex: -1,
            }}
          />
        ))}

        {/* Eyes — absolutely positioned as a % of the sun so they always size
            correctly. Left/right eye centred on 34% / 66% of the width. */}
        {[0.34, 0.66].map((leftPct, i) => (
          <div
            key={i}
            className="absolute flex items-center justify-center rounded-full bg-white shadow-inner"
            style={{
              width: '22%',
              height: '22%',
              left: `${leftPct * 100}%`,
              top: '34%',
              transform: `translate(-50%, -50%) scaleY(${eyeScaleY})`,
              transition: 'transform 90ms ease',
            }}
          >
            <motion.div
              className="relative rounded-full bg-slate-900"
              style={{
                width: '46%',
                height: expr === 'surprised' ? '54%' : '46%',
                x: px,
                y: py,
              }}
            >
              {/* eye glint */}
              <span
                className="absolute rounded-full bg-white"
                style={{ width: '32%', height: '32%', left: '16%', top: '14%' }}
              />
            </motion.div>
          </div>
        ))}

        {/* Rosy cheeks */}
        <div
          className="absolute rounded-full"
          style={{ left: '14%', top: '56%', width: '16%', height: '11%', background: 'rgba(255,120,120,0.55)', filter: 'blur(2px)' }}
        />
        <div
          className="absolute rounded-full"
          style={{ right: '14%', top: '56%', width: '16%', height: '11%', background: 'rgba(255,120,120,0.55)', filter: 'blur(2px)' }}
        />

        {/* Mouth */}
        <Mouth expr={expr} />
      </motion.button>
    </div>
  );
}

function Mouth({ expr }: { expr: Expr }) {
  // Three quick expressions, drawn as SVG paths.
  const path =
    expr === 'surprised'
      ? 'M 34 12 a 16 16 0 1 0 32 0 a 16 16 0 1 0 -32 0'
      : expr === 'giggly'
        ? 'M 20 6 Q 50 40 80 6 Q 50 20 20 6 Z'
        : 'M 22 6 Q 50 34 78 6';
  return (
    <svg
      className="absolute left-1/2 top-[64%] -translate-x-1/2"
      width="46%"
      viewBox="0 0 100 46"
      fill={expr === 'smile' ? 'none' : '#7a2b2b'}
      stroke="#7a2b2b"
      strokeWidth={6}
      strokeLinecap="round"
    >
      <path d={path} />
      {expr !== 'surprised' && (
        <path d="M 30 10 Q 50 24 70 10" fill="#ff7a7a" stroke="none" />
      )}
    </svg>
  );
}
