import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial, Vector3 } from 'three';
import { waterVertexShader, waterFragmentShader } from '../shaders/water';
import { flowState } from '../lib/flowState';
import { prefersReducedMotion } from '../lib/motion';

/**
 * The flowing-water shader material for the planet sphere.
 *
 * Every frame we copy the CPU-accumulated flow state into the shader uniforms:
 *   uTheta    <- flowState.theta   (∫omega dt — direction & amount of current)
 *   uStrength <- flowState.strength (spin magnitude — foam boost)
 * The geometry itself is untouched, so the ball never wobbles; only the
 * surface currents move. See shaders/water.ts and lib/flowState.ts.
 */
export default function Water() {
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTheta: { value: new Vector3() },
      uStrength: { value: 0 },
      // Key light roughly from the sun sitting up-and-behind the planet.
      uLightDir: { value: new Vector3(0.35, 0.55, 0.75).normalize() },
      uColorDeep: { value: new Color('#1e73d6') },
      uColorMid: { value: new Color('#38a7f2') },
      uColorShallow: { value: new Color('#8fe3ff') },
      uFoam: { value: new Color('#f4fdff') },
    }),
    [],
  );

  useFrame((_, delta) => {
    const u = uniforms;
    // Idle flow is dampened (but not frozen) under reduced-motion.
    u.uTime.value += prefersReducedMotion ? delta * 0.25 : delta;
    u.uTheta.value.copy(flowState.theta);
    u.uStrength.value = flowState.strength;
  });

  return (
    <shaderMaterial
      ref={matRef}
      vertexShader={waterVertexShader}
      fragmentShader={waterFragmentShader}
      uniforms={uniforms}
    />
  );
}
