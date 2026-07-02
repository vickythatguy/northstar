import { Vector3 } from 'three';

/**
 * Shared mutable bridge between the drag/rotation controller and the water
 * shader. Kept as a plain module singleton (not React state) so that writing
 * to it every frame never triggers a re-render.
 *
 * How the water flow is driven by rotation
 * ----------------------------------------
 * The tangential velocity of a point `n` on a sphere spinning with angular
 * velocity `omega` is `v = omega × n`. Integrated over time that displacement
 * is `(∫omega dt) × n = theta × n`. Because the cross product is linear in its
 * first argument, we can accumulate the single vector `theta = ∫omega dt` on
 * the CPU and let the shader compute the per-fragment flow offset as
 * `theta × n`. This gives perfectly continuous flow that follows the drag
 * direction and speed with **no phase jumps** when the spin speed changes.
 */
export const flowState = {
  /** Smoothed angular velocity of the planet (rad/s), local space. */
  omega: new Vector3(0, 0, 0),
  /** Accumulated rotation vector, ∫(omega + idle) dt. Fed to the shader. */
  theta: new Vector3(0, 0, 0),
  /** 0..~1 scalar spin magnitude — boosts foam/turbulence while spinning. */
  strength: 0,
};
