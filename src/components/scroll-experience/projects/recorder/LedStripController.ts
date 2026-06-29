import * as THREE from "three";
import type { RecorderState } from "./RecorderStateMachine";
import { LED_COUNT } from "./recorderConstants";
import {
  colorForTimeLeft,
  pulseRateForTimeLeft,
  breathe,
} from "./ledColorRamp";

const DEVICE_COLOR = new THREE.Color("#39c8c0");
const BOOT_COLOR = new THREE.Color("#ff9a3c");
const _c = new THREE.Color();

/**
 * Drives the 6 status LEDs. One concern: per-frame color + glow intensity for
 * each LED's emissive material, faithful to the firmware patterns (standby
 * breath, hold fill R→L, recording time-ramp breath, finalize bounce).
 */
export class LedStripController {
  private materials: THREE.MeshStandardMaterial[] = [];
  private lights: THREE.PointLight[] = [];
  // Reused per-LED return value — update() consumes it (copies the color)
  // before the next ledFor() call, so a single pooled object is safe.
  private readonly ledResult: { color: THREE.Color; intensity: number } = {
    color: _c,
    intensity: 0,
  };

  setMaterials(mats: THREE.MeshStandardMaterial[]): void {
    this.materials = mats;
  }

  /** Actual point lights co-located with each LED — they spill colored light
   *  out through the slit onto the surrounding case. */
  setLights(lights: THREE.PointLight[]): void {
    this.lights = lights;
  }

  update(
    state: RecorderState,
    holdProgress: number,
    timeLeftFrac: number,
    clock: number,
  ): void {
    for (let i = 0; i < this.materials.length; i++) {
      const { color, intensity } = this.ledFor(state, i, holdProgress, timeLeftFrac, clock);
      const m = this.materials[i];
      m.emissive.copy(color);
      m.emissiveIntensity = intensity;
      m.color.set("#0a0c0f");
      const light = this.lights[i];
      if (light) {
        light.color.copy(color);
        light.intensity = intensity * 1.4;
      }
    }
  }

  setOff(): void {
    for (const m of this.materials) m.emissiveIntensity = 0;
    for (const l of this.lights) l.intensity = 0;
  }

  private ledFor(
    state: RecorderState,
    i: number,
    holdProgress: number,
    frac: number,
    clock: number,
  ): { color: THREE.Color; intensity: number } {
    switch (state) {
      // LEDs are recessed inside the case (seen through the slit), so the base
      // intensities run high to keep the glow readable through the opening.
      case "BOOT": {
        const head = ((clock * 1.4) % 1) * LED_COUNT;
        const raw = Math.abs(i - head);
        const dist = Math.min(raw, LED_COUNT - raw); // wrap-around chase
        return this.result(_c.copy(BOOT_COLOR), 0.15 + Math.max(0, 1 - dist * 0.7) * 6);
      }
      case "CONFIRM_START":
      case "CONFIRM_STOP": {
        const lit = holdProgress * LED_COUNT;
        const on = i < lit; // fill left → right
        return this.result(_c.copy(DEVICE_COLOR), on ? 7.0 : 0.1);
      }
      case "RECORDING": {
        const env = breathe(clock, pulseRateForTimeLeft(frac));
        return this.result(colorForTimeLeft(frac), 2.4 + env * 5.0);
      }
      case "FINALIZING": {
        const head = Math.floor((clock * 6) % LED_COUNT);
        const on = i === head;
        return this.result(_c.copy(DEVICE_COLOR), on ? 7.5 : 0.12);
      }
      case "STANDBY": {
        const env = breathe(clock, 0.4);
        return this.result(_c.copy(DEVICE_COLOR), 2.0 + env * 3.0);
      }
      default:
        return this.result(_c.copy(DEVICE_COLOR), 0.04);
    }
  }

  private result(color: THREE.Color, intensity: number): { color: THREE.Color; intensity: number } {
    this.ledResult.color = color;
    this.ledResult.intensity = intensity;
    return this.ledResult;
  }
}
