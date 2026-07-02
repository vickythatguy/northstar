/**
 * Single source of truth for `prefers-reduced-motion`. Read once and cached;
 * used to dampen idle water flow, disable auto-drift, and calm the sun/boats.
 */
export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
