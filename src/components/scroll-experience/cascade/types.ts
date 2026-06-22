import type { RefObject } from "react";

export interface DecodedKeyframe {
  positions: Float32Array;
  scales: Float32Array;
  count: number;
}

export interface CascadeState {
  keyframeA: DecodedKeyframe;
  keyframeB: DecodedKeyframe;
  transitionProgress: number;
  cascadeSpread: number;
  cascadeOrigin: string;
  positionEasing: number;
  depthFarA: number;
  depthNearA: number;
  depthFarB: number;
  depthNearB: number;
  falloffProgress?: number;
  fallCascadeOrigin?: string;
}

export interface CascadeParticlesProps {
  cascadeState: RefObject<CascadeState>;
  debugNoDepthScale?: boolean;
}

export const PARTICLE_COUNT = 5000;
