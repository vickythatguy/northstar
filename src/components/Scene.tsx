import PlanetController from './PlanetController';

/** In-canvas content: soft cartoon lighting + the interactive water-planet. */
export default function Scene() {
  return (
    <>
      {/* Flat, cheerful lighting for the toon boats (the water lights itself). */}
      <ambientLight intensity={0.95} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-4, -2, -3]} intensity={0.25} />
      <PlanetController />
    </>
  );
}
