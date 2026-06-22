import * as THREE from "three";

/**
 * Mouse-driven brightness ripple overlay for iPhone screens.
 *
 * Architecture:
 *   CPU: RippleManager tracks up to 8 concurrent ripples in a ring buffer.
 *        Each frame it advances radii, fades intensities, and packs the
 *        state into a Float32Array that maps 1:1 to the shader's uniform.
 *   GPU: A transparent overlay plane sits just in front of the screen face.
 *        Its ShaderMaterial renders only the ripple rings as warm semi-
 *        transparent shadows — the underlying phone materials are untouched.
 */

// ── Shader source ──────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec4 u_ripples[8];   // xy = cursor UV trail, z = age, w = intensity
  uniform int u_rippleCount;
  uniform float u_time;

  varying vec2 vUv;

  // Simplex-ish hash for organic noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    float wave = 0.0;

    for (int i = 0; i < 8; i++) {
      if (i >= u_rippleCount) break;

      vec2 center = u_ripples[i].xy;
      float age = u_ripples[i].z;
      float intensity = u_ripples[i].w;

      vec2 delta = vUv - center;
      float dist = length(delta);

      // Flowing wave: a sine field that radiates from the cursor point,
      // modulated by organic noise so it reads as a water-caustic surf
      // rather than perfect concentric circles.
      float noiseVal = noise(vUv * 8.0 + u_time * 0.5);
      float waveFreq = 18.0;
      float wavePhase = dist * waveFreq - age * 6.0 + noiseVal * 2.5;
      float waveSin = sin(wavePhase) * 0.5 + 0.5;

      // Envelope: fade with distance from cursor and with age
      float distFade = exp(-dist * 4.0);
      float ageFade = intensity;

      wave += waveSin * distFade * ageFade * 0.6;
    }

    wave = clamp(wave, 0.0, 1.0);

    // Dark wave on light surface — clearly visible on white screens.
    // High alpha so it's unmissable during dev.
    float alpha = wave * 0.5;
    vec3 tint = vec3(0.0, 0.0, 0.0);
    gl_FragColor = vec4(tint, alpha);
  }
`;

// ── Ripple lifecycle manager ───────────────────────────────────────

interface Ripple {
  centerU: number;
  centerV: number;
  radius: number;
  intensity: number;
  age: number;
}

export class RippleManager {
  static readonly MAX_RIPPLES = 8;
  static readonly EXPANSION_SPEED = 0.28;
  static readonly LIFETIME = 1.4;
  static readonly SPAWN_COOLDOWN = 0.06;
  static readonly MIN_MOVE_DIST = 0.015;

  readonly uniforms = new Float32Array(RippleManager.MAX_RIPPLES * 4);
  private pool: Ripple[] = [];
  private lastSpawnU = -1;
  private lastSpawnV = -1;
  private lastSpawnTime = -1;

  update(
    hitUV: { u: number; v: number } | null,
    delta: number,
    elapsed: number,
  ): void {
    if (hitUV) {
      const du = hitUV.u - this.lastSpawnU;
      const dv = hitUV.v - this.lastSpawnV;
      const dist = Math.sqrt(du * du + dv * dv);
      const cooled = elapsed - this.lastSpawnTime > RippleManager.SPAWN_COOLDOWN;
      if ((dist > RippleManager.MIN_MOVE_DIST || this.lastSpawnTime < 0) && cooled) {
        this.spawn(hitUV.u, hitUV.v);
        this.lastSpawnU = hitUV.u;
        this.lastSpawnV = hitUV.v;
        this.lastSpawnTime = elapsed;
      }
    }

    for (let i = this.pool.length - 1; i >= 0; i--) {
      const r = this.pool[i];
      r.age += delta;
      r.radius += RippleManager.EXPANSION_SPEED * delta;
      const life = Math.min(r.age / RippleManager.LIFETIME, 1);
      r.intensity = 1 - life * life;
      if (r.intensity <= 0.005) {
        this.pool.splice(i, 1);
      }
    }

    this.uniforms.fill(0);
    for (let i = 0; i < this.pool.length; i++) {
      const r = this.pool[i];
      const base = i * 4;
      this.uniforms[base] = r.centerU;
      this.uniforms[base + 1] = r.centerV;
      this.uniforms[base + 2] = r.age;        // z = age (shader uses for wave phase)
      this.uniforms[base + 3] = r.intensity;
    }
  }

  get count(): number {
    return this.pool.length;
  }

  private spawn(u: number, v: number): void {
    if (this.pool.length >= RippleManager.MAX_RIPPLES) {
      this.pool.shift();
    }
    this.pool.push({
      centerU: u,
      centerV: v,
      radius: 0,
      intensity: 1,
      age: 0,
    });
  }
}

// ── Material factory ───────────────────────────────────────────────

/**
 * Build a transparent ShaderMaterial for the ripple overlay plane.
 * Renders only the ripple rings as semi-transparent warm shadows.
 */
export function createRippleOverlayMaterial(): THREE.ShaderMaterial {
  const rippleData = new Float32Array(RippleManager.MAX_RIPPLES * 4);

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      u_ripples: { value: rippleData },
      u_rippleCount: { value: 0 },
      u_time: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}
