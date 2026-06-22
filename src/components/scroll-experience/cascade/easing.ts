/**
 * CPU mirror of the cascade shader's `applyEasing` function. Must stay in
 * lock-step with shaders/cascadeVertex.glsl — any change to one file requires
 * the same change to the other, or CPU-side physics will drift from the GPU.
 *
 * Mode mapping:
 *   0 — smoothstep (default)
 *   1 — cubic-in
 *   2 — cubic-out
 *   3 — cubic-in-out
 *   4 — elastic-out
 *   5 — linear
 */
export type EasingMode = 0 | 1 | 2 | 3 | 4 | 5;

const ELASTIC_FREQ = 2.0943951; // (2π / 3) — matches the shader constant.

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function cubicIn(t: number): number {
  return t * t * t;
}

function cubicOut(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

function cubicInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function elasticOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_FREQ) + 1;
}

function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function applyEasing(t: number, mode: number): number {
  if (mode === 1) return cubicIn(t);
  if (mode === 2) return cubicOut(t);
  if (mode === 3) return cubicInOut(t);
  if (mode === 4) return elasticOut(t);
  if (mode === 5) return t;
  return smoothstep01(t);
}
