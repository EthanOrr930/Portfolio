import type {
  CameraKeyframe,
  TransformKeyframe,
  ModelKeyframe,
  ModelTransition,
  PositionEasingType,
  CascadeOrigin,
} from "./types";
import { BezierEasing } from "./bezier";

// ---------------------------------------------------------------------------
// Catmull-Rom spline helpers (ported from ScrollCanvas.tsx)
// ---------------------------------------------------------------------------

function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  return (
    0.5 *
    ((2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
  );
}

function clampIndex<T>(arr: T[], i: number): number {
  return Math.max(0, Math.min(arr.length - 1, i));
}

/**
 * Given a sorted keyframe array and a vh position, find the pair
 * of keyframes that the vh falls between and the local progress 0..1.
 */
function findSegment<T extends { vh: number; easing?: { preset: string } }>(
  keyframes: T[],
  vh: number,
): { index: number; progress: number } {
  if (keyframes.length === 0) return { index: 0, progress: 0 };
  if (vh <= keyframes[0].vh) return { index: 0, progress: 0 };
  if (vh >= keyframes[keyframes.length - 1].vh) {
    return { index: keyframes.length - 1, progress: 0 };
  }

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (vh >= keyframes[i].vh && vh < keyframes[i + 1].vh) {
      const span = keyframes[i + 1].vh - keyframes[i].vh;
      const rawProgress = span > 0 ? (vh - keyframes[i].vh) / span : 0;
      return { index: i, progress: rawProgress };
    }
  }

  return { index: keyframes.length - 1, progress: 0 };
}

// ---------------------------------------------------------------------------
// Camera interpolation
// ---------------------------------------------------------------------------

export interface InterpolatedCamera {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
  depthNear: number;
  depthFar: number;
}

export function interpolateCamera(
  keyframes: CameraKeyframe[],
  vh: number,
): InterpolatedCamera {
  if (keyframes.length === 0) {
    return {
      position: [0, 0, 2.8],
      rotation: [0, 0, 0],
      fov: 50,
      depthNear: 1.8,
      depthFar: 3.5,
    };
  }

  const { index, progress } = findSegment(keyframes, vh);

  if (progress === 0) {
    const kf = keyframes[index];
    return {
      position: [...kf.position],
      rotation: [...kf.rotation],
      fov: kf.fov,
      depthNear: kf.depthNear,
      depthFar: kf.depthFar,
    };
  }

  // Apply bezier easing from the destination keyframe
  const destKf = keyframes[index + 1];
  const easing = new BezierEasing(destKf.easing.preset);
  const t = easing.evaluate(progress);

  const i = index;
  const pos: [number, number, number] = [0, 0, 0];
  const rot: [number, number, number] = [0, 0, 0];

  for (let axis = 0; axis < 3; axis++) {
    pos[axis] = catmullRom(
      keyframes[clampIndex(keyframes, i - 1)].position[axis],
      keyframes[i].position[axis],
      keyframes[clampIndex(keyframes, i + 1)].position[axis],
      keyframes[clampIndex(keyframes, i + 2)].position[axis],
      t,
    );
    rot[axis] = catmullRom(
      keyframes[clampIndex(keyframes, i - 1)].rotation[axis],
      keyframes[i].rotation[axis],
      keyframes[clampIndex(keyframes, i + 1)].rotation[axis],
      keyframes[clampIndex(keyframes, i + 2)].rotation[axis],
      t,
    );
  }

  const fov = catmullRom(
    keyframes[clampIndex(keyframes, i - 1)].fov,
    keyframes[i].fov,
    keyframes[clampIndex(keyframes, i + 1)].fov,
    keyframes[clampIndex(keyframes, i + 2)].fov,
    t,
  );

  // Lerp depth values (no spline needed — simpler)
  const depthNear =
    keyframes[i].depthNear + t * (destKf.depthNear - keyframes[i].depthNear);
  const depthFar =
    keyframes[i].depthFar + t * (destKf.depthFar - keyframes[i].depthFar);

  return { position: pos, rotation: rot, fov, depthNear, depthFar };
}

// ---------------------------------------------------------------------------
// Transform interpolation
// ---------------------------------------------------------------------------

export interface InterpolatedTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export function interpolateTransform(
  keyframes: TransformKeyframe[],
  vh: number,
): InterpolatedTransform {
  if (keyframes.length === 0) {
    return { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 };
  }

  const { index, progress } = findSegment(keyframes, vh);

  if (progress === 0) {
    const kf = keyframes[index];
    return {
      position: [...kf.position],
      rotation: [...kf.rotation],
      scale: kf.scale,
    };
  }

  const destKf = keyframes[index + 1];
  const easing = new BezierEasing(destKf.easing.preset);
  const t = easing.evaluate(progress);

  const i = index;
  const pos: [number, number, number] = [0, 0, 0];
  const rot: [number, number, number] = [0, 0, 0];

  for (let axis = 0; axis < 3; axis++) {
    pos[axis] = catmullRom(
      keyframes[clampIndex(keyframes, i - 1)].position[axis],
      keyframes[i].position[axis],
      keyframes[clampIndex(keyframes, i + 1)].position[axis],
      keyframes[clampIndex(keyframes, i + 2)].position[axis],
      t,
    );
    rot[axis] = catmullRom(
      keyframes[clampIndex(keyframes, i - 1)].rotation[axis],
      keyframes[i].rotation[axis],
      keyframes[clampIndex(keyframes, i + 1)].rotation[axis],
      keyframes[clampIndex(keyframes, i + 2)].rotation[axis],
      t,
    );
  }

  const scale = catmullRom(
    keyframes[clampIndex(keyframes, i - 1)].scale,
    keyframes[i].scale,
    keyframes[clampIndex(keyframes, i + 1)].scale,
    keyframes[clampIndex(keyframes, i + 2)].scale,
    t,
  );

  return { position: pos, rotation: rot, scale: Math.max(0.01, scale) };
}

// ---------------------------------------------------------------------------
// Model state resolution
// ---------------------------------------------------------------------------

export const POSITION_EASING_MAP: Record<PositionEasingType, number> = {
  smoothstep: 0,
  "ease-in-cubic": 1,
  "ease-out-cubic": 2,
  "ease-in-out-cubic": 3,
  "ease-out-elastic": 4,
  linear: 5,
};

export interface ResolvedModelState {
  /** Index of the "from" model keyframe */
  keyframeAIndex: number;
  /** Index of the "to" model keyframe */
  keyframeBIndex: number;
  /** Transition progress 0..1 between A and B */
  transitionProgress: number;
  /** Cascade origin for the active transition */
  cascadeOrigin: CascadeOrigin;
  /** Cascade spread for the active transition */
  cascadeSpread: number;
  /** Position easing enum value for the shader */
  positionEasing: number;
  /** Depth fade values from camera interpolation should be applied separately */
}

export function resolveModelState(
  keyframes: ModelKeyframe[],
  transitions: ModelTransition[],
  vh: number,
): ResolvedModelState {
  const defaultState: ResolvedModelState = {
    keyframeAIndex: 0,
    keyframeBIndex: 0,
    transitionProgress: 0,
    cascadeOrigin: "top-down",
    cascadeSpread: 0.5,
    positionEasing: 0,
  };

  if (keyframes.length === 0) return defaultState;

  // Build a keyframe id → index lookup
  const idToIndex = new Map<string, number>();
  for (let i = 0; i < keyframes.length; i++) {
    idToIndex.set(keyframes[i].id, i);
  }

  // Search all transitions to find one whose range covers the current vh
  for (const t of transitions) {
    const fromIdx = idToIndex.get(t.fromKeyframeId);
    const toIdx = idToIndex.get(t.toKeyframeId);
    if (fromIdx === undefined || toIdx === undefined) continue;

    const fromKf = keyframes[fromIdx];
    const toKf = keyframes[toIdx];
    const blockStart = Math.min(fromKf.vh, toKf.vh);
    const blockEnd = Math.max(fromKf.vh, toKf.vh);

    // Is vh within this transition's block range?
    if (vh < blockStart || vh > blockEnd) continue;

    // Compute active transition window using offsets
    const activeStart = blockStart + (t.startOffset ?? 0);
    const activeEnd = blockEnd - (t.endOffset ?? 0);

    let progress: number;
    if (vh <= activeStart) {
      progress = 0; // hold at model A
    } else if (vh >= activeEnd) {
      progress = 1; // hold at model B
    } else {
      const span = activeEnd - activeStart;
      progress = span > 0 ? (vh - activeStart) / span : 0;
    }

    return {
      keyframeAIndex: fromIdx,
      keyframeBIndex: toIdx,
      transitionProgress: progress,
      cascadeOrigin: t.cascadeOrigin,
      cascadeSpread: t.cascadeSpread,
      positionEasing: POSITION_EASING_MAP[t.positionEasing] ?? 0,
    };
  }

  // No transition covers this vh — find the closest keyframe and hold there
  let closestIdx = 0;
  let closestDist = Infinity;
  for (let i = 0; i < keyframes.length; i++) {
    const dist = Math.abs(keyframes[i].vh - vh);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }

  // If we're past a keyframe, show the one we're closest to
  return { ...defaultState, keyframeAIndex: closestIdx, keyframeBIndex: closestIdx };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Get the maximum vh across all tracks — defines the animation end point. */
export function getMaxVh(scene: {
  camera: { keyframes: { vh: number }[] };
  transform: { keyframes: { vh: number }[] };
  model: { keyframes: { vh: number }[] };
}): number {
  const all = [
    ...scene.camera.keyframes.map((k) => k.vh),
    ...scene.transform.keyframes.map((k) => k.vh),
    ...scene.model.keyframes.map((k) => k.vh),
  ];
  return all.length > 0 ? Math.max(...all) : 0;
}
