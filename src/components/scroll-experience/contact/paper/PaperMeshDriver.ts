import * as THREE from "three";
import { stepSpring, spring } from "../../motionTokens";
import type { MouseNdc } from "../../projects/useMouseNdcRef";
import type { ContactPhase } from "../contactTypes";
import { PaperFoldController } from "./PaperFoldController";
import { flightState, makeFlightState, type FlightState } from "./foldFlight";

const TILT_MAX = 0.18;          // radians the sheet leans from the cursor
const FLIGHT_DURATION = 2.0;    // full travel; plane keeps gliding after the card
const CARD_AT = 0.42;           // flight t to reveal "on its way" (≈0.85s in, plane still flying)

export interface FrameInput {
  delta: number;
  phase: ContactPhase;
  mouse: MouseNdc;
  tiltGroup: THREE.Object3D;
  flightGroup: THREE.Object3D;
  material: THREE.Material & { opacity: number; transparent: boolean };
  onFoldSettled: () => void;
  onFlightComplete: () => void;
}

/**
 * Per-frame driver for one paper mesh: cursor tilt, fold settle detection, and
 * the launch flight (a Bézier trajectory with the nose aligned to velocity).
 * Stateful (tilt springs, flight clock, one-shot flags) → a class.
 */
export class PaperMeshDriver {
  private tiltX = 0;
  private tiltY = 0;
  private velX = 0;
  private velY = 0;
  private flightT = 0;
  private foldFired = false;
  private launched = false;
  private cardFired = false;
  private readonly state: FlightState = makeFlightState();

  constructor(private readonly controller: PaperFoldController) {}

  update(input: FrameInput): void {
    this.updateTilt(input);
    this.updateFold(input);
    this.updateFlight(input);
  }

  private updateTilt(input: FrameInput): void {
    const live = input.phase === "filling";
    // Lean AWAY from the cursor: cursor above → top edge recedes, etc.
    const tx = live ? -input.mouse.y * TILT_MAX : 0;
    const ty = live ? input.mouse.x * TILT_MAX : 0;
    const sx = stepSpring(this.tiltX, this.velX, tx, spring.gentle, input.delta);
    const sy = stepSpring(this.tiltY, this.velY, ty, spring.gentle, input.delta);
    this.tiltX = sx.value;
    this.velX = sx.velocity;
    this.tiltY = sy.value;
    this.velY = sy.velocity;
    input.tiltGroup.rotation.set(this.tiltX, this.tiltY, 0);
  }

  private updateFold(input: FrameInput): void {
    this.controller.update(input.delta);
    if (input.phase === "filling") {
      this.foldFired = false;
      return;
    }
    if (input.phase === "folding" && this.controller.isSettled && !this.foldFired) {
      this.foldFired = true;
      input.onFoldSettled();
    }
  }

  private updateFlight(input: FrameInput): void {
    if (input.phase === "filling") {
      this.resetFlight(input);
      return;
    }
    if (input.phase === "flying") this.launched = true;
    if (!this.launched || this.flightT >= 1) return;

    this.flightT = Math.min(1, this.flightT + input.delta / FLIGHT_DURATION);
    flightState(this.flightT, this.state);
    input.flightGroup.position.copy(this.state.position);
    input.flightGroup.quaternion.copy(this.state.quaternion);

    // Reveal the card mid-flight; the plane keeps gliding off after (no hard stop).
    if (this.flightT >= CARD_AT && !this.cardFired) {
      this.cardFired = true;
      input.onFlightComplete();
    }
  }

  private resetFlight(input: FrameInput): void {
    this.flightT = 0;
    this.launched = false;
    this.cardFired = false;
    input.flightGroup.position.set(0, 0, 0);
    input.flightGroup.quaternion.identity();
    input.material.opacity = 1;
    input.material.transparent = false;
  }
}
