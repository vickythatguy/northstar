# Drift 🌊

**A sea for half-formed ideas.**

A bright, cartoonish 3D water-planet you can spin and zoom. Drop little
sailboats onto the water — each boat is an idea. Tap a boat to feed it thoughts
and it grows. Calm, playful, Pinterest-aesthetic. Not a productivity tool.

## Stack

- **Vite + React + TypeScript + Tailwind CSS**
- **React Three Fiber** (`@react-three/fiber`) + `@react-three/drei` for the 3D scene
- **Framer Motion** for UI + the sun character
- **Dexie** (IndexedDB) for persistence
- **Zustand** for app state

Mobile-first, touch-driven, targets ~60fps on a phone.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## How it works

### Flowing water (the important part)

The sphere geometry never moves — no vertex displacement, no jelly wobble. All
motion lives in a custom fragment shader (`src/shaders/water.ts`) that scrolls a
domain of 3D simplex noise across the surface to fake flowing currents and foam,
blended across three tones of blue.

**Flow follows rotation.** The drag controller
(`src/components/PlanetController.tsx`) tracks the planet's angular velocity and
feeds it to the shader. The trick (see `src/lib/flowState.ts`): the tangential
velocity of a surface point `n` on a sphere spinning at `ω` is `ω × n`, whose
time-integral is `(∫ω dt) × n = θ × n`. We accumulate the single vector
`θ = ∫ω dt` on the CPU and let the shader compute `θ × n` per fragment — so
currents stream in the direction you drag, faster the faster you spin, and glide
back to a gentle idle drift when you let go, with **no popping** when the speed
changes.

### The sun — a Talking-Tom character

`src/components/SunCharacter.tsx` is a googly smiley rendered as **DOM behind the
transparent R3F canvas**, so the opaque globe occludes it and it peeks out
around the edges. Its eyes track your cursor/finger, it blinks on its own, and
poking it (routed via `onPointerMissed` since the canvas is on top) triggers a
cycling set of springy Framer-Motion reactions — squish, boing, spin.

### Boats = ideas

Tap the water to raycast the sphere and drop a boat at that point (stored as a
unit-sphere position so it rotates with the planet). Boats bob, grow as you add
thoughts, and show a floating name label when zoomed in and facing the camera.

### Navigation

A shelf of idea chips at the bottom flies the planet so an idea faces front and
zooms in. The 🌊 button surfaces back out. Drag to rotate, wheel/pinch to zoom,
on-screen +/− as a fallback.

### Persistence

Everything lives in IndexedDB via Dexie (`src/lib/db.ts`) and reloads on refresh
— boats reappear where you left them.

## Structure

```
src/
  App.tsx                     layers: sky → sun → canvas → UI
  store.ts                    useDriftStore (Zustand) + Dexie writes
  shaders/water.ts            the flow shader (commented)
  lib/
    flowState.ts              rotation → flow uniform bridge (commented)
    controls.ts               camera/zoom + pointer control state
    db.ts                     Dexie schema
    types.ts, motion.ts, sound.ts, sunLayout.ts
  components/
    Sky, SunCharacter, Scene, PlanetController,
    Water, Boat, IdeaSheet, IdeaShelf, Controls
```

Respects `prefers-reduced-motion` (dampened idle flow, calmer sun & boats, no
auto-spin).
