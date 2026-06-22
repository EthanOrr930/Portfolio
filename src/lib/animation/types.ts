import type { CascadeOrigin, PositionEasingType } from "@/lib/pages/types";
import type { ProcessingParams } from "@/lib/geometry/types";

// Re-export for convenience
export type { CascadeOrigin, PositionEasingType, ProcessingParams };

// ---------------------------------------------------------------------------
// Bezier easing — OOP-friendly for future visual editor upgrade
// ---------------------------------------------------------------------------
export type BezierPreset =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "smooth";

export interface BezierCurve {
  preset: BezierPreset;
  // Future: controlPoints?: [number, number, number, number];
}

// ---------------------------------------------------------------------------
// Track tabs
// ---------------------------------------------------------------------------
export type EditorTab = "camera" | "transform" | "model";

// ---------------------------------------------------------------------------
// Camera track
// ---------------------------------------------------------------------------
export interface CameraKeyframe {
  id: string;
  vh: number;
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
  depthNear: number;
  depthFar: number;
  easing: BezierCurve;
}

// ---------------------------------------------------------------------------
// Transform track
// ---------------------------------------------------------------------------
export interface TransformKeyframe {
  id: string;
  vh: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  easing: BezierCurve;
}

// ---------------------------------------------------------------------------
// Model track
// ---------------------------------------------------------------------------
export interface ModelKeyframe {
  id: string;
  vh: number;
  label: string;
  exrPath: string;
  positionCount: number;
  processingParams?: ProcessingParams;
  sourceModelPath?: string;
}

export interface ModelTransition {
  id: string;
  fromKeyframeId: string;
  toKeyframeId: string;
  cascadeOrigin: CascadeOrigin;
  cascadeSpread: number;
  positionEasing: PositionEasingType;
  /** vh offset from fromKeyframe — transition active region starts here */
  startOffset: number;
  /** vh offset backwards from toKeyframe — transition active region ends here */
  endOffset: number;
}

// ---------------------------------------------------------------------------
// Scene data — single JSON file
// ---------------------------------------------------------------------------
export interface SceneData {
  version: 2;
  settings: {
    particleCount: number;
    particleScale?: number;
    backgroundColors: {
      center: string;
      edge: string;
    };
  };
  camera: {
    keyframes: CameraKeyframe[];
  };
  transform: {
    keyframes: TransformKeyframe[];
  };
  model: {
    keyframes: ModelKeyframe[];
    transitions: ModelTransition[];
  };
}
