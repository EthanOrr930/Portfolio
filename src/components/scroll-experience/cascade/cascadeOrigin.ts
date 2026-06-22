/**
 * Cascade origin vocabulary. Each named origin maps to a direction vector
 * (dx, dy, dz) and a mode flag that tells the shader/CPU how to pick the
 * per-particle start time:
 *   mode 0 — project source keyframe position onto direction
 *   mode 1 — project destination keyframe position onto direction ("build")
 *   mode 2 — use a per-particle random value
 */
export type CascadeOriginVector = readonly [number, number, number, number];

const ORIGIN_TABLE: Record<string, CascadeOriginVector> = {
  "top-down":          [0, -1, 0, 0],
  "bottom-up":         [0,  1, 0, 0],
  "left-right":        [1,  0, 0, 0],
  "right-left":        [-1, 0, 0, 0],
  "front-back":        [0,  0, -1, 0],
  "back-front":        [0,  0,  1, 0],
  "build-top-down":    [0, -1, 0, 1],
  "build-bottom-up":   [0,  1, 0, 1],
  "build-left-right":  [1,  0, 0, 1],
  "build-right-left":  [-1, 0, 0, 1],
  "build-front-back":  [0,  0, -1, 1],
  "build-back-front":  [0,  0,  1, 1],
  "random":            [0,  0,  0, 2],
};

const DEFAULT_ORIGIN: CascadeOriginVector = [0, -1, 0, 0];

export function cascadeOriginToDir(origin: string): CascadeOriginVector {
  return ORIGIN_TABLE[origin] ?? DEFAULT_ORIGIN;
}
