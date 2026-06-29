/**
 * GLSL source + injection helpers for projected ocean caustics on a cube.
 *
 * Faithful port of the reference caustics.glsl pipeline:
 *   oceanCaustics (1-octave animated band field)
 *     → causticStack (2 octaves multiplied, multi-scale filaments)
 *     → causticVoronoi (F2-F1 crease net — the branching web)
 *     → chromatic aberration (R/G/B sampled at offset UVs → dispersion)
 *     → computeCaustics (top-down world-XZ projection + facing/depth mask)
 *
 * Added to `gl_FragColor.rgb` just before `<tonemapping_fragment>` so it
 * reads as projected light in linear space (survives lighting, feeds bloom).
 *
 * This file owns shader strings only. Uniform lifecycle, per-frame time, and
 * the active-gate live in CausticsLight.
 */

// Tuned for this scene's ~0.6-unit cube (reference used 0.24 on a much
// larger body). Scale sets cell density across the top face.
const CAUSTIC_SCALE = 2.2;
const CAUSTIC_CA = 0.022;

const CAUSTICS_FUNCTIONS = /* glsl */ `
  #define CAUSTIC_TAU 6.28318530718

  // ── 1 octave: animated bright-band distance field ─────────────────
  // mod() tiles uv to a seamless 2π period; the -250 offset breaks the
  // origin symmetry. A self-referential sin/cos domain warp makes the
  // bands ripple organically instead of forming grid-aligned stripes.
  float oceanCaustics(vec2 uv, float t) {
    vec2 p = mod(uv * CAUSTIC_TAU, CAUSTIC_TAU) - 250.0;
    vec2 i = p;
    float c = 1.0;
    const float inten = 0.0045;
    for (int n = 0; n < 5; n++) {
      float tt = t * 0.55 * (1.0 - 3.5 / float(n + 1));
      i = p + vec2(cos(tt - i.x) + sin(tt + i.y),
                   sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten),
                             p.y / (cos(i.y + tt) / inten)));
    }
    c /= 5.0;
    c = 1.17 - pow(c, 1.4);
    // Clamp >1 on purpose so peaks blow out → bloom sparkle. Lower gamma than
    // the reference (6→3.5) so each band reads as a bold ribbon, not a string.
    return clamp(pow(abs(c), 3.5), 0.0, 1.6);
  }

  // ── 2 octaves multiplied: sparse multi-scale filaments ────────────
  float causticStack(vec2 uv, float t) {
    float coarse = oceanCaustics(uv, t);
    // Lower-frequency, lighter-weight fine octave → fewer overlapping strands.
    float fine = oceanCaustics(uv * 1.4 + vec2(13.1, 7.3), t * 1.35);
    return coarse * (0.7 + 0.5 * fine);
  }

  // ── Animated Voronoi → F1 (nearest) / F2 (2nd nearest) ────────────
  vec2 causticHash(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                          dot(p, vec2(269.5, 183.3)))) * 43758.5453);
  }
  vec2 causticVoronoi(vec2 uv, float t) {
    vec2 n = floor(uv);
    vec2 f = fract(uv);
    float f1 = 8.0;
    float f2 = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = causticHash(n + g);
        o = 0.5 + 0.5 * sin(t + CAUSTIC_TAU * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; }
        else if (d < f2) { f2 = d; }
      }
    }
    return vec2(sqrt(f1), sqrt(f2));
  }

  // ── Assemble: flow drift + chromatic aberration + crease net ──────
  vec3 causticColor(vec2 uv, float t) {
    uv += vec2(t * 0.018, -t * 0.012);
    vec2 dir = vec2(0.707) * ${CAUSTIC_CA.toFixed(3)};
    vec3 warp = vec3(
      causticStack(uv + dir, t),
      causticStack(uv, t),
      causticStack(uv - dir, t)
    );
    // Larger Voronoi cells (0.62→0.42) = fewer strands; wider crease band
    // (0.45→0.70) + gentler thinning curve (4→2) = bold lines, not hairlines.
    vec2 v = causticVoronoi(uv * 0.42, t * 0.6);
    float net = pow(1.0 - smoothstep(0.0, 0.70, v.y - v.x), 2.0);
    return warp * (0.30 + 2.6 * net);
  }

  // ── Apply to surface: top-down projection + facing/depth mask ─────
  vec3 computeCaustics(
    vec3 wpos, vec3 wn, float t, float intensity, float topY
  ) {
    float up = clamp(normalize(wn).y, 0.0, 1.0);
    float facing = pow(up, 0.7);
    // Dissolve down the cube's own height (~0.6 units tall here).
    float heightFade = smoothstep(topY - 0.7, topY - 0.02, wpos.y);
    float strength = facing * heightFade;
    if (strength <= 0.0) return vec3(0.0);

    vec3 caustic = causticColor(wpos.xz * ${CAUSTIC_SCALE.toFixed(3)}, t);
    vec3 tint = vec3(0.85, 0.99, 1.0);
    return tint * caustic * intensity * strength;
  }
`;

const FRAGMENT_PARS = /* glsl */ `
  varying vec3 vCausticWorldPos;
  varying vec3 vCausticWorldNormal;
  uniform float uCausticTime;
  uniform float uCausticTopY;
  uniform float uCausticIntensity;
  uniform float uCausticActive;
  ${CAUSTICS_FUNCTIONS}
`;

const FRAGMENT_APPLY = /* glsl */ `
  if (uCausticActive > 0.5) {
    vec3 caustic = computeCaustics(
      vCausticWorldPos,
      normalize(vCausticWorldNormal),
      uCausticTime,
      uCausticIntensity,
      uCausticTopY
    );
    gl_FragColor.rgb += caustic;
  }
`;

/** Add world-space position + normal varyings to a standard vertex shader. */
export function injectCausticsVertex(src: string): string {
  return src
    .replace(
      "#include <common>",
      "#include <common>\n  varying vec3 vCausticWorldPos;\n  varying vec3 vCausticWorldNormal;",
    )
    .replace(
      "#include <worldpos_vertex>",
      "#include <worldpos_vertex>\n  vCausticWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n  vCausticWorldNormal = normalize(mat3(modelMatrix) * objectNormal);",
    );
}

/** Inject the caustic field + its additive apply into a standard fragment
 *  shader. */
export function injectCausticsFragment(src: string): string {
  return src
    .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
    .replace(
      "#include <tonemapping_fragment>",
      `${FRAGMENT_APPLY}\n#include <tonemapping_fragment>`,
    );
}
