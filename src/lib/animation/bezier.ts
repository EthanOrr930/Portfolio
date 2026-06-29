import type { BezierPreset } from "./types";

/**
 * Cubic bezier control points [x1, y1, x2, y2].
 * Maps preset names to standard CSS-like cubic bezier values.
 */
const PRESET_POINTS: Record<BezierPreset, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  smooth: [0.25, 0.1, 0.25, 1],
};

/**
 * Evaluates a cubic bezier curve at parameter t.
 * Uses iterative Newton-Raphson to solve for t given x, then evaluates y.
 */
export class BezierEasing {
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;

  constructor(preset: BezierPreset);
  constructor(x1: number, y1: number, x2: number, y2: number);
  constructor(
    presetOrX1: BezierPreset | number,
    y1?: number,
    x2?: number,
    y2?: number,
  ) {
    if (typeof presetOrX1 === "string") {
      const pts = PRESET_POINTS[presetOrX1];
      [this.x1, this.y1, this.x2, this.y2] = pts;
    } else {
      this.x1 = presetOrX1;
      this.y1 = y1!;
      this.x2 = x2!;
      this.y2 = y2!;
    }
  }

  /** Evaluate the easing at progress t (0..1), returns eased value (0..1). */
  evaluate(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // Linear shortcut
    if (this.x1 === 0 && this.y1 === 0 && this.x2 === 1 && this.y2 === 1) {
      return t;
    }

    // Newton-Raphson to find the bezier parameter for the given x (t)
    let guess = t;
    for (let i = 0; i < 8; i++) {
      const x = this.bezierX(guess) - t;
      if (Math.abs(x) < 1e-6) break;
      const dx = this.bezierDX(guess);
      if (Math.abs(dx) < 1e-6) break;
      guess -= x / dx;
    }

    return this.bezierY(guess);
  }

  private bezierX(t: number): number {
    const t2 = 1 - t;
    return 3 * t2 * t2 * t * this.x1 + 3 * t2 * t * t * this.x2 + t * t * t;
  }

  private bezierY(t: number): number {
    const t2 = 1 - t;
    return 3 * t2 * t2 * t * this.y1 + 3 * t2 * t * t * this.y2 + t * t * t;
  }

  private bezierDX(t: number): number {
    const t2 = 1 - t;
    return (
      3 * t2 * t2 * this.x1 +
      6 * t2 * t * (this.x2 - this.x1) +
      3 * t * t * (1 - this.x2)
    );
  }
}

/** Convenience: evaluate a preset by name at progress t. */
export function evaluateBezierPreset(preset: BezierPreset, t: number): number {
  return getBezierEasing(preset).evaluate(t);
}

// A BezierEasing built from a preset is immutable and its evaluate() is pure,
// so one instance per preset can be shared. This avoids allocating a fresh
// solver every frame on the scroll interpolation hot path.
const presetCache = new Map<BezierPreset, BezierEasing>();

/** Returns a shared, immutable BezierEasing for the given preset. */
export function getBezierEasing(preset: BezierPreset): BezierEasing {
  let easing = presetCache.get(preset);
  if (!easing) {
    easing = new BezierEasing(preset);
    presetCache.set(preset, easing);
  }
  return easing;
}
