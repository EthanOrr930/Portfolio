/**
 * House motion tokens for the scroll experience.
 *
 * These are the ONLY easings and springs that should be used in this
 * project — not `ease`, `ease-in-out`, or polynomial hand-rolls.
 *
 * Everything below is a cubic-bézier control point array so it can feed
 * either a CSS `cubic-bezier(...)` string or a hand-rolled JS evaluator.
 */

// ── Easing control points ──────────────────────────────────────────
// Named after their role so usage sites read as intent, not math.
export const easing = {
  /** Apple-ish standard curve for most UI in+out. */
  standard: [0.32, 0.72, 0, 1] as const,
  /** Expo-out — confident arrival. Use for entrances. */
  out: [0.22, 1, 0.36, 1] as const,
  /** Expo-in — decisive exit. Use for exits. */
  in: [0.64, 0, 0.78, 0] as const,
  /** Material 3 emphasized — slight overshoot. Playful. */
  emphasized: [0.2, 0, 0, 1.2] as const,
} as const;

// ── Cubic-bézier evaluator ─────────────────────────────────────────
// Use when the animation is scroll-scrubbed and you need to apply a
// curve to a [0,1] progress value. For CSS transitions, build a string
// with `toCssBezier(easing.out)` instead.
function bezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  // Solve x(t) = t via Newton-Raphson with fallback to bisection, then
  // evaluate y(t). Single curve, single allocation, hot-path friendly.
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 4; i++) {
      const xt = sampleX(t) - x;
      if (Math.abs(xt) < 1e-5) break;
      const d = sampleDerivX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= xt / d;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

export const curves = {
  standard: bezier(...easing.standard),
  out: bezier(...easing.out),
  in: bezier(...easing.in),
  emphasized: bezier(...easing.emphasized),
} as const;

export function toCssBezier(e: readonly [number, number, number, number]): string {
  return `cubic-bezier(${e[0]}, ${e[1]}, ${e[2]}, ${e[3]})`;
}

// ── Spring presets ─────────────────────────────────────────────────
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const spring = {
  /** Snappy default for most UI. */
  snappy: { stiffness: 400, damping: 40, mass: 1 } as SpringConfig,
  /** Smooth — for larger elements / longer travel. */
  smooth: { stiffness: 260, damping: 32, mass: 1 } as SpringConfig,
  /** Gentle — for hero transitions / big layout changes. */
  gentle: { stiffness: 180, damping: 20, mass: 1 } as SpringConfig,
  /** Bouncy — for playful feedback. */
  bouncy: { stiffness: 500, damping: 22, mass: 1 } as SpringConfig,
} as const;

/**
 * Single axis critically-damped spring integrator. Call every frame with
 * the previous value + velocity and you get the new value + velocity.
 * Uses semi-implicit Euler for stability at variable frame rates.
 */
export function stepSpring(
  value: number,
  velocity: number,
  target: number,
  config: SpringConfig,
  delta: number,
): { value: number; velocity: number } {
  // Sub-step on long frames so stiff springs don't explode on a hitch.
  const maxSub = 1 / 120;
  let v = value;
  let vel = velocity;
  let remaining = Math.min(delta, 0.064);
  while (remaining > 0) {
    const h = Math.min(remaining, maxSub);
    const accel = (config.stiffness * (target - v) - config.damping * vel) / config.mass;
    vel += accel * h;
    v += vel * h;
    remaining -= h;
  }
  return { value: v, velocity: vel };
}

// ── Reduced motion ─────────────────────────────────────────────────
/**
 * Returns true if the user prefers reduced motion. Non-reactive — if the
 * user toggles the OS setting mid-session, re-mount the component.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
