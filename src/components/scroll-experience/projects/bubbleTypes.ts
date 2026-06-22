import type * as THREE from "three";

export interface BubbleSystemConfig {
  poolSize: number;
  lifetimeMin: number;
  lifetimeMax: number;
  baseScaleMin: number;
  baseScaleMax: number;
  /** Initial upward velocity when a bubble is born (m/s). */
  initialRiseSpeedMin: number;
  initialRiseSpeedMax: number;
  /** Constant buoyancy accel (m/s²). Real bubbles speed up as they rise. */
  buoyancy: number;
  /** Exponential drag — caps terminal velocity. */
  riseDrag: number;
  /** Fraction of the cube's current velocity imparted to each new bubble
   *  so they trail the falling cube before buoyancy wins. */
  cubeVelocityInheritance: number;
  /** Lateral jitter applied to initial bubble velocity (± m/s). */
  lateralJitter: number;
  wobbleAmp: number;
  wobbleFreq: number;
  /** Age fraction at which the bubble begins scaling toward 0 (fade out). */
  fadeScaleStart: number;
}

export const DEFAULT_BUBBLE_CONFIG: BubbleSystemConfig = {
  // Big burst cloud (≈ rate × duration alive at peak).
  poolSize: 760,
  lifetimeMin: 2.0,
  lifetimeMax: 3.6,
  // Wide range: tiny specks up to decent bubbles.
  baseScaleMin: 0.0006,
  baseScaleMax: 0.013,
  initialRiseSpeedMin: 0.12,
  initialRiseSpeedMax: 0.45,
  buoyancy: 2.0,
  riseDrag: 1.2,
  cubeVelocityInheritance: 0.28,
  lateralJitter: 0.1,
  wobbleAmp: 0.04,
  wobbleFreq: 5,
  fadeScaleStart: 0.82,
};

/**
 * Caller-provided spawn logic so the BubbleSystem stays decoupled from
 * cube geometry. On each emit, the system calls:
 *   - samplePosition(out) — write the bubble's world-space spawn point
 *   - sampleSourceVelocity(out) — the emitting body's current velocity
 *                                 (inherited fractionally by the bubble)
 */
export interface BubbleSpawnProvider {
  samplePosition(out: THREE.Vector3): void;
  sampleSourceVelocity(out: THREE.Vector3): void;
}

