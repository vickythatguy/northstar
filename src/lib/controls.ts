import { Quaternion } from 'three';

export const PLANET_RADIUS = 1;

/** Camera-distance bounds and defaults (camera sits on +Z looking at origin).
 * With a 45° FOV these keep the planet at roughly half the viewport height in
 * the "surface" view and fill more of the screen when zoomed onto a boat. */
export const CAMERA_FOV = 45;
export const FAR_DIST = 5.2; // full-planet "surface" view (~half height)
export const NEAR_DIST = 3.3; // zoomed in on a boat
export const MIN_DIST = 2.8;
export const MAX_DIST = 6.4;

/** The planet sits a bit below centre so the sun's face peeks over the top. */
export const PLANET_Y = -0.42;

/**
 * Shared, non-reactive bridge between the DOM UI (zoom buttons, shelf) and the
 * in-canvas PlanetController. Mutated directly; read every frame. Avoids
 * re-renders on the hot path.
 */
export const camControl = {
  /** Eased camera distance target. */
  targetDist: FAR_DIST,
  /** Target orientation for a fly-to; group quaternion slerps toward it. */
  targetQuat: new Quaternion(),
  /** Whether the controller should slerp toward targetQuat (fly-to active). */
  slerping: false,
};

/** True while the current pointer gesture has moved far enough to be a drag
 * (not a tap). Read by tap handlers so a drag never drops/opens a boat. */
export const pointer = { moved: false };

export function nudgeZoom(delta: number) {
  camControl.targetDist = clampDist(camControl.targetDist + delta);
}

export function clampDist(d: number) {
  return Math.min(MAX_DIST, Math.max(MIN_DIST, d));
}
