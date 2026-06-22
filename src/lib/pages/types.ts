export interface PageData {
  version: 1;
  settings: {
    particleCount: number;
    particleScale?: number;
    backgroundColors: {
      center: string;
      edge: string;
    };
  };
  keyframes: KeyframeData[];
}

export interface KeyframeData {
  id: string;
  label: string;
  particles: {
    exrPath: string;
    positionCount: number;
    camera: {
      position: [number, number, number];
      rotation: [number, number, number];
      fov: number;
    };
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
    };
    /** Depth fade: particles beyond depthFar fade to 0, fully visible at depthNear */
    depthFar?: number;
    depthNear?: number;
  };
  elements: TextElement[];
  transition: {
    scrollDuration: number;
    cascadeOrigin: CascadeOrigin;
    easing: EasingType;
    cascadeSpread: number;
    /** Easing for per-particle position interpolation during cascade */
    positionEasing?: PositionEasingType;
  };
}

export interface TextElement {
  id: string;
  text: string;
  position: { x: number; y: number };
  style: TextStyle;
  enterAnimation?: EnterAnimation;
  enterDelay?: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  opacity: number;
  textAlign: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  maxWidth?: number;
}

export type CascadeOrigin =
  // Dissolve order (based on source/model A position)
  | "top-down" | "bottom-up" | "left-right" | "right-left" | "front-back" | "back-front"
  // Build order (based on destination/model B position)
  | "build-top-down" | "build-bottom-up" | "build-left-right" | "build-right-left" | "build-front-back" | "build-back-front"
  // Random
  | "random";
export type EasingType = "ease-in-out" | "ease-out" | "ease-in" | "linear";
export type PositionEasingType = "smoothstep" | "ease-in-cubic" | "ease-out-cubic" | "ease-in-out-cubic" | "ease-out-elastic" | "linear";
export type EnterAnimation = "slide-up" | "fade" | "slide-left" | "slide-right";
