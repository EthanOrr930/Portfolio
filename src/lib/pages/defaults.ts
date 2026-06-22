import type { PageData, KeyframeData, TextElement } from "./types";

let idCounter = 0;
function uid(): string {
  return `${Date.now()}-${++idCounter}`;
}

export function createDefaultTextElement(overrides?: Partial<TextElement>): TextElement {
  return {
    id: uid(),
    text: "New Text",
    position: { x: 50, y: 50 },
    style: {
      fontFamily: "Geist",
      fontSize: 24,
      fontWeight: 400,
      color: "#1a1a1a",
      opacity: 1,
      textAlign: "center",
    },
    enterAnimation: "slide-up",
    ...overrides,
  };
}

export function createDefaultKeyframe(overrides?: Partial<KeyframeData>): KeyframeData {
  return {
    id: uid(),
    label: "Untitled",
    particles: {
      exrPath: "textures/positions.exr",
      positionCount: 9407,
      camera: {
        position: [0, 0, 2.8],
        rotation: [0, 0, 0],
        fov: 50,
      },
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1,
      },
      depthFar: 3.5,
      depthNear: 1.8,
    },
    elements: [],
    transition: {
      scrollDuration: 1.5,
      cascadeOrigin: "top-down",
      easing: "ease-in-out",
      cascadeSpread: 0.5,
      positionEasing: "smoothstep",
    },
    ...overrides,
  };
}

export function createDefaultPageData(): PageData {
  return {
    version: 1,
    settings: {
      particleCount: 9407,
      backgroundColors: {
        center: "#f5f0eb",
        edge: "#e8e0d8",
      },
    },
    keyframes: [createDefaultKeyframe({ label: "Hero" })],
  };
}
