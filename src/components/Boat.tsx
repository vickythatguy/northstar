import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  BufferAttribute,
  BufferGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Quaternion,
  Shape,
  Vector3,
} from 'three';
import type { Idea } from '../lib/types';
import { PLANET_RADIUS, pointer, NEAR_DIST } from '../lib/controls';
import { prefersReducedMotion } from '../lib/motion';

const UP = new Vector3(0, 1, 0);
const MAX_GROWTH_THOUGHTS = 8; // boat stops growing past this many thoughts

interface Props {
  idea: Idea;
  onOpen: (id: string) => void;
}

/** A single double-sided triangle geometry from three flat points (XY plane). */
function triangle(a: number[], b: number[], c: number[]) {
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([...a, ...b, ...c]), 3),
  );
  g.computeVertexNormals();
  return g;
}

export default function Boat({ idea, onOpen }: Props) {
  const outerRef = useRef<Group>(null); // oriented to the surface (fixed)
  const bobRef = useRef<Group>(null); // bobbing + rocking + scaling
  const flagRef = useRef<Group>(null); // waving pennant
  const wakeRef = useRef<Mesh>(null); // inner foam ring
  const wakeRef2 = useRef<Mesh>(null); // outer ripple ring
  const { camera } = useThree();
  const [labelVisible, setLabelVisible] = useState(false);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  // Surface position + orientation (up = surface normal). Recomputed only when
  // the stored position changes.
  const { position, quaternion } = useMemo(() => {
    const n = new Vector3(...idea.position).normalize();
    const q = new Quaternion().setFromUnitVectors(UP, n);
    return { position: n.multiplyScalar(PLANET_RADIUS), quaternion: q };
  }, [idea.position]);

  // Curved toon hull: a boat silhouette (length = X, height = Y) extruded across
  // its width (Z) with a soft bevel so the edges read as rounded.
  const hullGeom = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.1, 0.05); // deck, stern
    s.lineTo(-0.11, 0.0); // stern transom
    s.quadraticCurveTo(-0.1, -0.055, -0.04, -0.06); // curve to the keel
    s.lineTo(0.05, -0.06); // flat keel
    s.quadraticCurveTo(0.12, -0.05, 0.14, 0.012); // rise to the bow
    s.lineTo(0.13, 0.055); // bow tip
    s.quadraticCurveTo(0.06, 0.05, 0.0, 0.05); // deck line back
    s.lineTo(-0.1, 0.05);
    const g = new ExtrudeGeometry(s, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 2,
      steps: 1,
    });
    g.translate(0, 0, -0.066); // centre across the width
    g.computeVertexNormals();
    return g;
  }, []);

  // Mainsail (billows toward the stern) and the little white masthead pennant.
  const sailGeom = useMemo(() => triangle([0, 0.06, 0], [0, 0.24, 0], [-0.1, 0.1, 0]), []);
  const flagGeom = useMemo(() => triangle([0, 0.022, 0], [0, -0.018, 0], [0.06, 0.004, 0]), []);

  // Target scale grows with thoughts, capped. Boats stay little.
  const targetScale = useMemo(() => {
    const t = Math.min(idea.thoughts.length, MAX_GROWTH_THOUGHTS);
    return 0.7 + (t / MAX_GROWTH_THOUGHTS) * 0.6; // 0.7 -> 1.3
  }, [idea.thoughts.length]);

  const worldPos = useMemo(() => new Vector3(), []);
  const worldNormal = useMemo(() => new Vector3(), []);
  const toCam = useMemo(() => new Vector3(), []);
  const scratchQ = useMemo(() => new Quaternion(), []);

  useFrame((state) => {
    const bob = bobRef.current;
    if (!bob) return;
    const amp = prefersReducedMotion ? 0.25 : 1;
    const t = state.clock.elapsedTime;

    // Wavy sailing motion: bob + sway + roll + pitch + a heading YAW wobble so
    // the boat visibly weaves rather than tracking dead straight.
    bob.position.y = 0.02 + Math.sin(t * 1.7 + phase) * 0.013 * amp;
    bob.position.x = Math.sin(t * 0.8 + phase) * 0.012 * amp;
    bob.rotation.z = Math.sin(t * 1.15 + phase) * 0.14 * amp; // roll
    bob.rotation.x = Math.sin(t * 0.9 + phase * 1.4) * 0.1 * amp; // pitch
    bob.rotation.y = Math.sin(t * 0.55 + phase) * 0.22 * amp; // yaw / weave

    // The pennant flaps in the breeze.
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(t * 7 + phase) * 0.5 * amp;
      flagRef.current.rotation.z = Math.sin(t * 5 + phase) * 0.16 * amp;
    }

    // Foam rings ripple outward on the (non-rocking) water surface.
    if (wakeRef.current) {
      const p = 1 + Math.sin(t * 2 + phase) * 0.08 * amp;
      wakeRef.current.scale.set(p, p, 1);
    }
    if (wakeRef2.current) {
      const p = 1 + Math.sin(t * 2 + phase + 1.5) * 0.1 * amp;
      wakeRef2.current.scale.set(p, p, 1);
    }

    // Smoothly ease toward the growth target.
    const sc = bob.scale.x + (targetScale - bob.scale.x) * 0.12;
    bob.scale.setScalar(sc);

    // Label: only when zoomed in and the boat faces the camera.
    const outer = outerRef.current;
    if (outer) {
      outer.getWorldPosition(worldPos);
      worldNormal.copy(UP).applyQuaternion(outer.getWorldQuaternion(scratchQ));
      toCam.copy(camera.position).sub(worldPos).normalize();
      const next = worldNormal.dot(toCam) > 0.35 && camera.position.length() < NEAR_DIST + 0.6;
      if (next !== labelVisible) setLabelVisible(next);
    }
  });

  const handleTap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (pointer.moved) return; // was a drag, not a tap
    onOpen(idea.id);
  };

  return (
    <group ref={outerRef} position={position} quaternion={quaternion}>
      {/* Foam wake — stays flat on the water while the boat rocks inside it. */}
      <mesh ref={wakeRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <torusGeometry args={[0.12, 0.014, 8, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <mesh ref={wakeRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[0.16, 0.008, 8, 32]} />
        <meshBasicMaterial color="#eafaff" transparent opacity={0.4} depthWrite={false} />
      </mesh>

      <group ref={bobRef} scale={0.7}>
        {/* Easy-to-tap invisible hit proxy around the whole boat. */}
        <mesh onClick={handleTap} position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Hull */}
        <mesh geometry={hullGeom} onClick={handleTap} castShadow>
          <meshToonMaterial color={idea.color} />
        </mesh>
        {/* Deck plank accent */}
        <mesh position={[0.01, 0.052, 0]}>
          <boxGeometry args={[0.19, 0.008, 0.1]} />
          <meshToonMaterial color="#f3e2c0" />
        </mesh>

        {/* Mast + boom */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.006, 0.007, 0.2, 8]} />
          <meshToonMaterial color="#8a5a2b" />
        </mesh>
        <mesh position={[-0.05, 0.065, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, 0.1, 6]} />
          <meshToonMaterial color="#8a5a2b" />
        </mesh>
        {/* Sail */}
        <mesh geometry={sailGeom}>
          <meshToonMaterial color="#fff6e6" side={2} />
        </mesh>
        {/* White flag at the masthead (waves) */}
        <group ref={flagRef} position={[0, 0.25, 0]}>
          <mesh geometry={flagGeom}>
            <meshToonMaterial color="#ffffff" side={2} />
          </mesh>
        </group>

        {/* The little sailor, near the stern */}
        <group position={[-0.055, 0.05, 0]}>
          {/* torso */}
          <mesh position={[0, 0.05, 0]}>
            <capsuleGeometry args={[0.018, 0.03, 4, 8]} />
            <meshToonMaterial color="#2b6cb0" />
          </mesh>
          {/* head */}
          <mesh position={[0, 0.095, 0]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshToonMaterial color="#f2c79b" />
          </mesh>
          {/* little hat brim */}
          <mesh position={[0, 0.108, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.006, 12]} />
            <meshToonMaterial color="#ffd23f" />
          </mesh>
          {/* arm reaching toward the tiller */}
          <mesh position={[0.02, 0.05, 0]} rotation={[0, 0, -0.7]}>
            <capsuleGeometry args={[0.007, 0.03, 4, 6]} />
            <meshToonMaterial color="#f2c79b" />
          </mesh>
        </group>

        {labelVisible && (
          <Html
            position={[0, 0.42, 0]}
            center
            distanceFactor={2.2}
            zIndexRange={[20, 0]}
            occlude={false}
            style={{ pointerEvents: 'none' }}
          >
            <div className="whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-sky-700 shadow-md">
              {idea.name}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
