import type {
  TransformKeyframe,
  ModelKeyframe,
  ModelTransition,
} from "@/lib/animation/types";

// When a particle model finishes constructing (a transition reaches its
// target keyframe), the formed shape carries its momentum a touch past the
// final pose, then settles back over a few vh — an overshoot felt in the
// "gray area" after the morph completes, layered on top of the base transform.
const OVERSHOOT_VH = 2.2; // how long the bounce lasts after construction
const POS_GAIN = 0.3; // overshoot as a fraction of the incoming move
const ROT_GAIN = 0.3; // overshoot as a fraction of the incoming rotation

export interface TransformOffset {
  position: [number, number, number];
  rotation: [number, number, number];
}

const ZERO_OFFSET: TransformOffset = { position: [0, 0, 0], rotation: [0, 0, 0] };

type Vec3 = [number, number, number];

/** One overshoot-and-return pulse across u∈[0,1]: 0 → peak → 0, peak skewed
 *  early so it shoots past quickly then eases back. */
function pulse(u: number): number {
  if (u <= 0 || u >= 1) return 0;
  return Math.sin(Math.PI * Math.pow(u, 0.7));
}

/** Transform delta of the segment that lands on the constructed pose — the
 *  direction the model was moving/rotating as it locked in. */
function constructionDelta(
  keyframes: TransformKeyframe[],
  constructedVh: number,
): { pos: Vec3; rot: Vec3 } {
  let j = 0;
  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].vh <= constructedVh + 1e-6) j = i;
  }
  const b = keyframes[j];
  const a = keyframes[Math.max(0, j - 1)];
  return {
    pos: [
      b.position[0] - a.position[0],
      b.position[1] - a.position[1],
      b.position[2] - a.position[2],
    ],
    rot: [
      b.rotation[0] - a.rotation[0],
      b.rotation[1] - a.rotation[1],
      b.rotation[2] - a.rotation[2],
    ],
  };
}

/**
 * Additive position+rotation offset to bolt onto the base group transform.
 * Non-zero only for the ~OVERSHOOT_VH after a model finishes constructing.
 */
export function computeConstructionOvershoot(
  transformKeyframes: TransformKeyframe[],
  modelKeyframes: ModelKeyframe[],
  modelTransitions: ModelTransition[],
  vh: number,
): TransformOffset {
  if (transformKeyframes.length < 2 || modelTransitions.length === 0) {
    return ZERO_OFFSET;
  }
  const vhById = new Map(modelKeyframes.map((k) => [k.id, k.vh]));

  for (const t of modelTransitions) {
    const constructedVh = vhById.get(t.toKeyframeId);
    if (constructedVh === undefined) continue;
    if (vh < constructedVh || vh > constructedVh + OVERSHOOT_VH) continue;

    const e = pulse((vh - constructedVh) / OVERSHOOT_VH);
    const d = constructionDelta(transformKeyframes, constructedVh);
    return {
      position: [
        d.pos[0] * POS_GAIN * e,
        d.pos[1] * POS_GAIN * e,
        d.pos[2] * POS_GAIN * e,
      ],
      rotation: [
        d.rot[0] * ROT_GAIN * e,
        d.rot[1] * ROT_GAIN * e,
        d.rot[2] * ROT_GAIN * e,
      ],
    };
  }
  return ZERO_OFFSET;
}
