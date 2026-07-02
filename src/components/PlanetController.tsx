import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Group, Mesh, Quaternion, Vector3 } from 'three';
import Water from './Water';
import Boat from './Boat';
import { useDriftStore } from '../store';
import { flowState } from '../lib/flowState';
import { prefersReducedMotion } from '../lib/motion';
import {
  camControl,
  pointer,
  PLANET_RADIUS,
  PLANET_Y,
  FAR_DIST,
  NEAR_DIST,
  clampDist,
} from '../lib/controls';

const ROT_PER_PX = 0.006; // radians of spin per pixel dragged
const MOVE_THRESHOLD = 6; // px before a gesture counts as a drag (not a tap)
// Fly-to brings a boat's surface normal to this direction: up-and-toward the
// camera, so we get a friendly 3/4 view (deck + standing sail) rather than a
// flat top-down look.
const FRONT = new Vector3(0, 0.45, 1).normalize();

/**
 * Owns the planet group and ALL interaction: drag-to-spin (with momentum),
 * wheel/pinch zoom, tap-to-drop-a-boat, and fly-to focus. Also converts the
 * spin into the water-flow uniforms via lib/flowState.
 */
export default function PlanetController() {
  const groupRef = useRef<Group>(null);
  const planetRef = useRef<Mesh>(null);
  const { camera, gl } = useThree();

  const ideas = useDriftStore((s) => s.ideas);
  const openNameSheet = useDriftStore((s) => s.openNameSheet);
  const openIdeaSheet = useDriftStore((s) => s.openIdeaSheet);

  // Mutable interaction state (never triggers re-render).
  const st = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    lastMoveT: 0,
    angVel: new Vector3(), // world-space angular velocity (axis * rad/s)
    pointers: new Map<number, { x: number; y: number }>(),
    pinchDist: 0,
  }).current;

  // Scratch vectors reused each frame.
  const tmp = useMemo(
    () => ({
      qInv: new Quaternion(),
      dq: new Quaternion(),
      omegaLocal: new Vector3(),
      axis: new Vector3(),
    }),
    [],
  );

  // --- Fly-to focus (subscribe to store, compute a target orientation) ------
  useEffect(() => {
    return useDriftStore.subscribe((state, prev) => {
      if (state.focus.nonce === prev.focus.nonce) return;
      const { ideaId } = state.focus;
      if (!ideaId) {
        // "Surface": keep orientation, just zoom back out.
        camControl.targetDist = FAR_DIST;
        camControl.slerping = false;
        return;
      }
      const idea = state.ideas.find((i) => i.id === ideaId);
      if (!idea) return;
      // Rotate the planet so this boat's surface normal points at the camera.
      const local = new Vector3(...idea.position).normalize();
      camControl.targetQuat.setFromUnitVectors(local, FRONT);
      camControl.targetDist = NEAR_DIST;
      camControl.slerping = true;
    });
  }, []);

  // --- DOM pointer/wheel handlers (full-canvas gestures) --------------------
  useEffect(() => {
    const el = gl.domElement;

    const setFlowFromDrag = (dx: number, dy: number, dt: number) => {
      // World-space angular velocity: horizontal drag spins about world Y,
      // vertical drag about world X. Store as axis*speed vector.
      st.angVel.set((dy * ROT_PER_PX) / dt, (dx * ROT_PER_PX) / dt, 0);
    };

    const onPointerDown = (e: PointerEvent) => {
      st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (st.pointers.size === 1) {
        st.dragging = true;
        pointer.moved = false;
        camControl.slerping = false; // user takes over from any fly-to
        st.lastX = e.clientX;
        st.lastY = e.clientY;
        st.lastMoveT = performance.now();
        st.angVel.set(0, 0, 0);
      } else if (st.pointers.size === 2) {
        // Second finger down -> begin a pinch, stop rotating.
        st.dragging = false;
        const [a, b] = [...st.pointers.values()];
        st.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      el.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = st.pointers.get(e.pointerId);
      if (p) {
        p.x = e.clientX;
        p.y = e.clientY;
      }

      if (st.pointers.size >= 2) {
        // Pinch-zoom.
        const [a, b] = [...st.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (st.pinchDist > 0) {
          const ratio = st.pinchDist / d; // >1 = fingers together = zoom out
          camControl.targetDist = clampDist(camControl.targetDist * ratio);
        }
        st.pinchDist = d;
        pointer.moved = true;
        return;
      }

      if (!st.dragging) return;
      const now = performance.now();
      const dt = Math.max((now - st.lastMoveT) / 1000, 0.001);
      const dx = e.clientX - st.lastX;
      const dy = e.clientY - st.lastY;
      if (Math.abs(dx) + Math.abs(dy) > MOVE_THRESHOLD) pointer.moved = true;

      // Spin the globe immediately (world-space premultiply = trackball feel).
      tmp.dq.setFromAxisAngle(new Vector3(1, 0, 0), dy * ROT_PER_PX);
      groupRef.current?.quaternion.premultiply(tmp.dq);
      tmp.dq.setFromAxisAngle(new Vector3(0, 1, 0), dx * ROT_PER_PX);
      groupRef.current?.quaternion.premultiply(tmp.dq);

      setFlowFromDrag(dx, dy, dt);
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.lastMoveT = now;
    };

    const endPointer = (e: PointerEvent) => {
      st.pointers.delete(e.pointerId);
      if (st.pointers.size < 2) st.pinchDist = 0;
      if (st.pointers.size === 0) st.dragging = false;
      el.releasePointerCapture?.(e.pointerId);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camControl.targetDist = clampDist(camControl.targetDist + e.deltaY * 0.0025);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endPointer);
      el.removeEventListener('pointercancel', endPointer);
      el.removeEventListener('wheel', onWheel);
    };
  }, [gl, st, tmp]);

  // --- Per-frame: momentum, flow uniforms, camera easing --------------------
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(delta, 1 / 30); // clamp on frame hitches

    if (camControl.slerping) {
      // Ease the planet toward the fly-to orientation.
      group.quaternion.slerp(camControl.targetQuat, 1 - Math.pow(0.001, dt));
      st.angVel.multiplyScalar(0.8);
      if (group.quaternion.angleTo(camControl.targetQuat) < 0.01) {
        camControl.slerping = false;
      }
    } else if (!st.dragging && st.angVel.lengthSq() > 1e-6) {
      // Momentum spin after release, with friction.
      tmp.axis.copy(st.angVel);
      const speed = tmp.axis.length();
      tmp.axis.normalize();
      tmp.dq.setFromAxisAngle(tmp.axis, speed * dt);
      group.quaternion.premultiply(tmp.dq);
      st.angVel.multiplyScalar(0.94);
    } else if (st.dragging && performance.now() - st.lastMoveT > 60) {
      // Finger held still -> currents ease off.
      st.angVel.multiplyScalar(0.8);
    }

    // World angular velocity -> planet-local frame (the shader's noise domain).
    tmp.qInv.copy(group.quaternion).invert();
    tmp.omegaLocal.copy(st.angVel).applyQuaternion(tmp.qInv);

    // Smooth the omega the water sees so flow speeds up / eases gracefully.
    flowState.omega.lerp(tmp.omegaLocal, 0.15);
    // Accumulate theta = ∫omega dt (continuous flow offset; see flowState.ts).
    flowState.theta.addScaledVector(flowState.omega, dt);
    // Spin magnitude -> foam/turbulence boost (0..~1).
    flowState.strength = Math.min(1, flowState.omega.length() * 0.25);

    // Ease the camera distance toward its target (zoom).
    const z = camera.position.z + (camControl.targetDist - camera.position.z) * 0.12;
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, 0);
  });

  // Tap on the water -> drop a boat at that point on the unit sphere.
  const handlePlanetTap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (pointer.moved) return; // was a drag
    const group = groupRef.current;
    if (!group) return;
    const local = group.worldToLocal(e.point.clone()).normalize();
    openNameSheet([local.x, local.y, local.z]);
  };

  // Idle drift: a slow auto-current so the sea never looks dead (off if reduced).
  useEffect(() => {
    if (prefersReducedMotion) return;
    // handled in the shader via uTime; nothing to do here.
  }, []);

  return (
    <group ref={groupRef} position={[0, PLANET_Y, 0]}>
      {/* The water-planet. Opaque, so it occludes the sun sitting behind it. */}
      <mesh ref={planetRef} onClick={handlePlanetTap}>
        <sphereGeometry args={[PLANET_RADIUS, 96, 96]} />
        <Water />
      </mesh>

      {/* Boats live inside the group, so they rotate with the planet. */}
      {ideas.map((idea) => (
        <Boat key={idea.id} idea={idea} onOpen={openIdeaSheet} />
      ))}
    </group>
  );
}
