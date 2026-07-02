/**
 * Sun placement, shared between the DOM character (SunCharacter) and the
 * canvas hit-test (App.onPointerMissed) so a poke lands exactly on the face.
 * The sun sits high in the sky so its eyes/smile peek over the top of the
 * planet, which is drawn lower in the viewport.
 */
export const SUN_TOP_VH = 0.07; // top offset as a fraction of viewport height
export const SUN_SIZE_VW = 0.82; // diameter as a fraction of viewport width
export const SUN_SIZE_MAX = 380; // px cap

export function sunGeometry(vw: number, vh: number) {
  const size = Math.min(vw * SUN_SIZE_VW, SUN_SIZE_MAX);
  return {
    size,
    cx: vw / 2,
    cy: vh * SUN_TOP_VH + size / 2,
    r: size / 2,
  };
}
