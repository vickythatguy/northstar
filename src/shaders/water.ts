/**
 * Blender-style flowing water for the planet surface.
 *
 * The sphere geometry never moves (no vertex displacement / no jelly wobble).
 * All motion lives in the fragment shader: we scroll a domain of 3D noise
 * across the surface to fake flowing currents and foam.
 *
 * Flow direction & speed follow the spin (see lib/flowState.ts):
 *   uTheta = ∫(omega) dt   — accumulated rotation vector from the drag controller
 * Per fragment the current offset is `theta × n` (n = surface normal). This is
 * the exact time-integral of the tangential surface velocity `omega × n`, so
 * the currents stream in the direction you drag, faster the faster you spin,
 * and glide to an idle drift when you let go — with no popping when speed changes.
 */

export const waterVertexShader = /* glsl */ `
  varying vec3 vNormalLocal; // normalized position on the unit sphere (flow domain)
  varying vec3 vWorldNormal; // world-space normal (for lighting)
  varying vec3 vViewDir;     // fragment -> camera (for fresnel foam)

  void main() {
    // For a unit sphere centred at the origin, the object-space position IS
    // the surface normal — this is our stable noise domain.
    vNormalLocal = normalize(position);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const waterFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3  uTheta;        // accumulated rotation vector (flow), from flowState
  uniform float uStrength;     // 0..~1 spin magnitude -> extra foam/turbulence
  uniform vec3  uLightDir;     // direction toward the sun-ish key light
  uniform vec3  uColorDeep;
  uniform vec3  uColorMid;
  uniform vec3  uColorShallow;
  uniform vec3  uFoam;

  varying vec3 vNormalLocal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  // --- Ashima simplex noise 3D --------------------------------------------
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Fractal noise for richer, layered currents.
  float fbm(vec3 p){
    float f = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++){
      f += amp * snoise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return f;
  }

  void main() {
    vec3 n = normalize(vNormalLocal);

    // Per-fragment current offset = theta × n  (time-integral of omega × n).
    // A gentle idle drift keeps the sea alive even when the planet is still.
    vec3 idle = vec3(0.0, uTime * 0.035, 0.0);
    vec3 flow = cross(uTheta, n) + idle;

    // Two scrolling octaves at different scales/speeds = braided currents.
    float base   = fbm(n * 2.4 + flow * 1.4);
    float detail = fbm(n * 5.5 - flow * 2.1 + 11.0);
    float w = base * 0.65 + detail * 0.35;          // -~1 .. ~1
    float h = w * 0.5 + 0.5;                          // 0 .. 1 "height"

    // Three tones of blue, deep troughs -> bright shallows. Kept in a fairly
    // narrow, bright band so the sea reads as clean cheerful colour (never murky).
    vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.25, 0.6, h));
    col = mix(col, uColorShallow, smoothstep(0.6, 0.95, h));

    // Foam on the crests; spinning stirs up extra foam via uStrength.
    float foamThresh = 0.80 - uStrength * 0.18;
    float foam = smoothstep(foamThresh, foamThresh + 0.12, h);
    // Thin foam streaks riding the current for a stylised, flowing look.
    float streak = smoothstep(0.6, 1.0, fbm(n * 9.0 + flow * 3.0));
    foam = clamp(foam + streak * (0.15 + uStrength * 0.35), 0.0, 1.0);
    col = mix(col, uFoam, foam);

    // Soft cartoon lighting: wrapped diffuse, kept bright so the far side stays
    // a friendly blue rather than going dark/murky.
    float diff = dot(normalize(vWorldNormal), normalize(uLightDir));
    float lit = diff * 0.5 + 0.5;                    // wrap
    col *= 0.9 + 0.28 * lit;

    // Fresnel foam glint at grazing angles for a rounded, glossy rim of water.
    float fres = pow(1.0 - max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0), 3.0);
    col += uFoam * fres * 0.20;

    gl_FragColor = vec4(col, 1.0);
  }
`;
