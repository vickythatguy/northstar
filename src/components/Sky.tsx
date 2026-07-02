/**
 * The daytime backdrop: a soft gradient (warm near the sun up top, azure
 * below) plus a few slow drifting CSS clouds for depth. Sits behind everything.
 */
const CLOUDS = [
  { top: '12%', w: 120, h: 34, dur: 70, delay: 0, o: 0.9 },
  { top: '26%', w: 90, h: 26, dur: 95, delay: -30, o: 0.8 },
  { top: '44%', w: 150, h: 40, dur: 120, delay: -60, o: 0.75 },
  { top: '62%', w: 80, h: 24, dur: 85, delay: -15, o: 0.7 },
  { top: '74%', w: 110, h: 32, dur: 105, delay: -45, o: 0.65 },
];

export default function Sky() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 90% at 50% 8%, #fff2c2 0%, #ffe08a 12%, #bfe6ff 42%, #86c9ff 100%)',
      }}
    >
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: c.top,
            width: c.w,
            height: c.h,
            opacity: c.o,
            animation: `drift-cloud ${c.dur}s linear ${c.delay}s infinite`,
            // pseudo-element puffs sized relative to the cloud
            ['--puff' as any]: `${c.h}px`,
          }}
        />
      ))}
    </div>
  );
}
