import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Quaternion,
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

export default function Boat({ idea, onOpen }: Props) {
  const outerRef = useRef<Group>(null); // oriented to the surface (fixed)
  const bobRef = useRef<Group>(null); // bobbing + scaling
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

  // A little cream triangular sail (single double-sided triangle).
  const sailGeom = useMemo(() => {
    const g = new BufferGeometry();
    const verts = new Float32Array([
      0, 0.012, 0, // tack, at the mast foot
      0, 0.19, 0, // head, at the mast top
      0.12, 0.05, 0, // clew, out to the side
    ]);
    g.setAttribute('position', new BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  // Target scale grows with thoughts, capped. Boats stay little.
  const targetScale = useMemo(() => {
    const t = Math.min(idea.thoughts.length, MAX_GROWTH_THOUGHTS);
    return 0.7 + (t / MAX_GROWTH_THOUGHTS) * 0.6; // 0.7 -> 1.3
  }, [idea.thoughts.length]);

  const worldPos = useMemo(() => new Vector3(), []);
  const worldNormal = useMemo(() => new Vector3(), []);
  const toCam = useMemo(() => new Vector3(), []);

  useFrame((state) => {
    const bob = bobRef.current;
    if (!bob) return;

    // Gentle bob along the surface normal + a slow rock. Calmed if reduced.
    const amp = prefersReducedMotion ? 0.2 : 1;
    const t = state.clock.elapsedTime;
    bob.position.y = 0.02 + Math.sin(t * 1.6 + phase) * 0.012 * amp;
    bob.rotation.z = Math.sin(t * 1.1 + phase) * 0.08 * amp;
    bob.rotation.x = Math.cos(t * 0.9 + phase) * 0.05 * amp;

    // Smoothly ease toward the growth target.
    const s = bob.scale.x + (targetScale - bob.scale.x) * 0.12;
    bob.scale.setScalar(s);

    // Label: only when zoomed in and the boat faces the camera.
    const outer = outerRef.current;
    if (outer) {
      outer.getWorldPosition(worldPos);
      worldNormal.copy(UP).applyQuaternion(outer.getWorldQuaternion(new Quaternion()));
      toCam.copy(camera.position).sub(worldPos).normalize();
      const facing = worldNormal.dot(toCam) > 0.35;
      const close = camera.position.length() < NEAR_DIST + 0.6;
      const next = facing && close;
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
      <group ref={bobRef} scale={0.7}>
        {/* Hull — bright toon colour */}
        <mesh position={[0, 0, 0]} onClick={handleTap} castShadow>
          <boxGeometry args={[0.12, 0.05, 0.19]} />
          <meshToonMaterial color={idea.color} />
        </mesh>
        {/* Rounded prow cap */}
        <mesh position={[0, 0, 0.105]} rotation={[Math.PI / 2, 0, 0]} onClick={handleTap}>
          <cylinderGeometry args={[0.025, 0.06, 0.065, 12]} />
          <meshToonMaterial color={idea.color} />
        </mesh>
        {/* Mast */}
        <mesh position={[0, 0.105, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.19, 8]} />
          <meshToonMaterial color="#8a5a2b" />
        </mesh>
        {/* Sail */}
        <mesh position={[0, 0.035, 0]} geometry={sailGeom}>
          <meshToonMaterial color="#fff6e6" side={2} />
        </mesh>

        {labelVisible && (
          <Html
            position={[0, 0.3, 0]}
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
