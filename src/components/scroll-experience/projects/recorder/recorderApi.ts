import type * as THREE from "three";
import type { RecorderStateMachine } from "./RecorderStateMachine";

/** Imperative handle the interaction layer drives (hold/tap/power/hit-test). */
export interface RecorderApi {
  sm: RecorderStateMachine;
  cycleSession(): void;
  togglePower(): void;
  isPowered(): boolean;
  getScreenMesh(): THREE.Mesh | null;
  /** Invisible marker at the power switch — for tutorial callout projection. */
  getSwitchAnchor(): THREE.Object3D | null;
}
