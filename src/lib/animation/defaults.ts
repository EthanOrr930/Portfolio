import type {
  SceneData,
  CameraKeyframe,
  TransformKeyframe,
  ModelKeyframe,
  ModelTransition,
} from "./types";

let idCounter = 0;
function uid(): string {
  return `${Date.now()}-${++idCounter}`;
}

export function createCameraKeyframe(
  overrides?: Partial<CameraKeyframe>,
): CameraKeyframe {
  return {
    id: uid(),
    vh: 0,
    position: [0, 0, 2.8],
    rotation: [0, 0, 0],
    fov: 50,
    depthNear: 1.8,
    depthFar: 3.5,
    easing: { preset: "smooth" },
    ...overrides,
  };
}

export function createTransformKeyframe(
  overrides?: Partial<TransformKeyframe>,
): TransformKeyframe {
  return {
    id: uid(),
    vh: 0,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
    easing: { preset: "smooth" },
    ...overrides,
  };
}

export function createModelKeyframe(
  overrides?: Partial<ModelKeyframe>,
): ModelKeyframe {
  return {
    id: uid(),
    vh: 0,
    label: "Untitled",
    exrPath: "textures/positions.exr",
    positionCount: 9407,
    ...overrides,
  };
}

export function createModelTransition(
  fromKeyframeId: string,
  toKeyframeId: string,
  overrides?: Partial<ModelTransition>,
): ModelTransition {
  return {
    id: uid(),
    fromKeyframeId,
    toKeyframeId,
    cascadeOrigin: "top-down",
    cascadeSpread: 0.5,
    positionEasing: "smoothstep",
    startOffset: 0,
    endOffset: 0,
    ...overrides,
  };
}

export function createDefaultSceneData(): SceneData {
  return {
    version: 2,
    settings: {
      particleCount: 9407,
      backgroundColors: {
        center: "#f5f0eb",
        edge: "#e8e0d8",
      },
    },
    camera: {
      keyframes: [createCameraKeyframe({ vh: 0 })],
    },
    transform: {
      keyframes: [createTransformKeyframe({ vh: 0 })],
    },
    model: {
      keyframes: [createModelKeyframe({ vh: 0, label: "Default" })],
      transitions: [],
    },
  };
}
