import * as THREE from "three";

// ── Billboard bubble shader ─────────────────────────────────────────
// Each bubble is a camera-facing quad drawn as a translucent sphere:
// near-empty interior, a bright thin fresnel rim ring, and a small
// upper-left specular glint — the Subnautica look. Per-instance seed
// drives size pulsing + rim twinkle so the field shimmers.

const bubbleVertexShader = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  varying vec2 vUv;
  varying float vTwinkle;

  void main() {
    vUv = uv;

    // Gentle per-bubble size pulse + rim twinkle (the "modulating" part).
    float pulse = 1.0 + 0.12 * sin(uTime * (1.6 + aSeed * 2.4) + aSeed * 6.2831);
    vTwinkle = 0.5 + 0.5 * sin(uTime * (3.0 + aSeed * 4.0) + aSeed * 19.0);

    // Billboard: take the instance centre in view space, offset the quad
    // corner along view X/Y so it always faces the camera. instanceMatrix
    // is auto-declared by three for InstancedMesh.
    mat4 mv = modelViewMatrix * instanceMatrix;
    vec4 center = mv * vec4(0.0, 0.0, 0.0, 1.0);
    float s = length(instanceMatrix[0].xyz) * 2.2 * pulse;
    center.xy += position.xy * s;
    gl_Position = projectionMatrix * center;
  }
`;

const bubbleFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying float vTwinkle;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    // Bolder gray circle outline — thicker ring, more contrast. No glint.
    float rim = smoothstep(0.56, 0.92, r) * (1.0 - smoothstep(0.92, 1.02, r));
    rim = pow(rim, 1.1);

    vec3 rimCol = vec3(0.34, 0.35, 0.38);
    float alpha = rim * (0.62 + 0.22 * vTwinkle);
    alpha *= smoothstep(1.0, 0.90, r); // edge AA
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(rimCol, alpha);
  }
`;

/** One-off factory for the billboard-bubble InstancedMesh. The material's
 *  `uTime` uniform is advanced each frame by BubbleSystem.step. */
export function createBubbleInstancedMesh(poolSize: number): THREE.InstancedMesh {
  const geometry = new THREE.PlaneGeometry(1, 1);
  attachSeedAttribute(geometry, poolSize);

  const material = new THREE.ShaderMaterial({
    vertexShader: bubbleVertexShader,
    fragmentShader: bubbleFragmentShader,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, poolSize);
  mesh.frustumCulled = false;
  return mesh;
}

/** Deterministic per-instance random seed for shimmer desync. */
function attachSeedAttribute(geometry: THREE.BufferGeometry, poolSize: number): void {
  const seeds = new Float32Array(poolSize);
  let s = 90210;
  for (let i = 0; i < poolSize; i++) {
    s = (s * 16807) % 2147483647;
    seeds[i] = s / 2147483647;
  }
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
}

/**
 * Sample a uniformly-random point on one of the 12 edges of a unit cube
 * centred at origin (vertices at ±0.5 on each axis). Writes into `out`;
 * no allocation. Caller transforms by the cube's world matrix to position
 * the bubble in world space.
 *
 * Physically: when a cube enters water the air rides along the edges
 * before escaping as bubbles — emitting from edges (not faces) reads as
 * the right "surface-tension-escaped" look.
 */
export function sampleUnitCubeEdge(out: THREE.Vector3): void {
  const axis = Math.floor(Math.random() * 3);
  const along = Math.random() - 0.5;
  const b = Math.random() < 0.5 ? -0.5 : 0.5;
  const c = Math.random() < 0.5 ? -0.5 : 0.5;
  if (axis === 0) out.set(along, b, c);
  else if (axis === 1) out.set(b, along, c);
  else out.set(b, c, along);
}

export function randInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
