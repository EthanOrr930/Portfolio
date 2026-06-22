import * as THREE from "three";
import {
  BubbleSystem,
  type BubbleSpawnProvider,
} from "./BubbleSystem";
import { sampleUnitCubeEdge } from "./bubbleHelpers";
import {
  MouseCurrentApplier,
  type MouseCurrentConfig,
} from "./MouseCurrentApplier";
import { WaterPhysicsBody, type WaterBodyConfig } from "./WaterPhysicsBody";
import type { MouseNdc } from "./useMouseNdcRef";

export type ProjectPhase = "before" | "revealed" | "after";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ProjectStageConfig {
  outer: THREE.Object3D;
  inner: THREE.Object3D;
  restPosition: Vec3;
  entrancePosition: Vec3;
  restEulerPitch: number;
  restEulerYaw: number;
  restEulerRoll: number;
  entranceVelocity: Vec3;
  entranceOmegaRange: number;
  /** Seconds to delay the entry after enterScene() is called. Lets the
   *  caller stagger multiple cubes without a react-timer. */
  entranceDelaySec: number;
  body: WaterBodyConfig;
  mouse: MouseCurrentConfig;
  /** Downward acceleration (units/s²) once the cube exits — it free-falls. */
  exitGravity: number;
  /** Seconds to delay the fall after exitScene() so the two cubes drop one
   *  before the other. */
  exitDelaySec: number;
  /** Seconds of continuous bubble emission after entry. */
  bubbleEmissionDuration: number;
  /** Bubbles/second while emission is active. */
  bubbleEmissionRate: number;
  /** Ambient turbulence amplitude (m/s² peak). */
  ambientAmp: number;
  ambientFreq: number;
  ambientPhase: number;
  reducedMotion: boolean;
}

const MAX_STEP_DT = 0.033;

/**
 * Orchestrates one cube: body integration, mouse-current corner-torque,
 * bubble emission that emits from the cube's edges via the inner group's
 * world matrix, ambient water turbulence, and phase-edge transitions.
 */
export class ProjectStageDriver {
  readonly bubbles: BubbleSystem;
  private readonly body: WaterPhysicsBody;
  private readonly current: MouseCurrentApplier;
  private readonly impulseScratch = new THREE.Vector3();
  private readonly spawnProvider: BubbleSpawnProvider;
  private pendingEnterSec = 0;
  private pendingExitSec = 0;
  private falling = false;
  private elapsedSec = 0;

  constructor(private readonly config: ProjectStageConfig) {
    this.body = new WaterPhysicsBody(config.outer, config.inner, config.body);
    this.current = new MouseCurrentApplier(config.mouse);
    this.bubbles = new BubbleSystem();
    this.spawnProvider = this.createSpawnProvider();
    this.snapToBefore();
  }

  /** Current body center (stage-local space — same space as the sibling
   *  cube, so the two can be compared directly for separation). */
  getCenter(out: THREE.Vector3): THREE.Vector3 {
    return this.body.getPosition(out);
  }

  /** Nudge the body's velocity — used by the inter-cube separation pass. */
  applyLinearImpulse(impulse: THREE.Vector3): void {
    this.body.applyLinearImpulse(impulse);
  }

  /** Current orientation — used by the inter-cube bounce pass to build OBBs. */
  getOrientation(out: THREE.Quaternion): THREE.Quaternion {
    return this.body.getOrientation(out);
  }

  /** Current linear velocity — used by the inter-cube bounce pass. */
  getVelocity(out: THREE.Vector3): THREE.Vector3 {
    return this.body.getVelocity(out);
  }

  enterScene(): void {
    if (this.config.reducedMotion) {
      this.snapToRest();
      return;
    }
    if (this.config.entranceDelaySec > 0) {
      this.pendingEnterSec = this.config.entranceDelaySec;
      return;
    }
    this.dropIntoWater();
  }

  exitScene(): void {
    if (this.config.reducedMotion) {
      this.body.snapToRest();
      return;
    }
    this.pendingEnterSec = 0;
    if (this.config.exitDelaySec > 0) {
      this.pendingExitSec = this.config.exitDelaySec;
      return;
    }
    this.beginFall();
  }

  snapToBefore(): void {
    this.body.seed(this.seedFor(this.config.entrancePosition, ZERO, ZERO), vec3(this.config.entrancePosition));
    this.body.snapToRest();
    this.bubbles.reset();
    this.pendingEnterSec = 0;
    this.pendingExitSec = 0;
    this.falling = false;
  }

  snapToRest(): void {
    this.body.seed(this.seedFor(this.config.restPosition, ZERO, ZERO), vec3(this.config.restPosition));
    this.body.snapToRest();
    this.bubbles.reset();
    this.pendingEnterSec = 0;
    this.pendingExitSec = 0;
    this.falling = false;
  }

  step(delta: number, mouseNdc: MouseNdc | null, camera: THREE.Camera): void {
    const dt = Math.min(delta, MAX_STEP_DT);
    this.elapsedSec += dt;
    this.maybeFireDelayedEntry(dt);
    this.maybeFireDelayedExit(dt);
    this.applyMouseCurrent(mouseNdc, dt, camera);
    this.applyAmbientTurbulence(dt);
    this.body.step(dt);
    // Ensure the inner group's world matrix reflects the new rotation
    // before bubble emission samples edges from it.
    this.config.inner.updateMatrixWorld();
    this.bubbles.step(dt);
  }

  // ── Internals ─────────────────────────────────────────────────────

  private maybeFireDelayedEntry(dt: number): void {
    if (this.pendingEnterSec <= 0) return;
    this.pendingEnterSec -= dt;
    if (this.pendingEnterSec <= 0) {
      this.pendingEnterSec = 0;
      this.dropIntoWater();
    }
  }

  private maybeFireDelayedExit(dt: number): void {
    if (this.pendingExitSec <= 0) return;
    this.pendingExitSec -= dt;
    if (this.pendingExitSec <= 0) {
      this.pendingExitSec = 0;
      this.beginFall();
    }
  }

  private beginFall(): void {
    this.falling = true;
    this.bubbles.stopEmission();
    this.body.startFall(this.config.exitGravity);
  }

  private dropIntoWater(): void {
    // Clear any prior free-fall so re-entry restores mouse/ambient response.
    this.falling = false;
    this.pendingExitSec = 0;
    const omega = this.randomOmega3();
    const seed = this.seedFor(
      this.config.entrancePosition,
      this.config.entranceVelocity,
      omega,
    );
    this.body.seed(seed, vec3(this.config.restPosition));
    this.bubbles.startEmission(
      this.config.bubbleEmissionDuration,
      this.config.bubbleEmissionRate,
      this.spawnProvider,
    );
  }

  private applyMouseCurrent(
    mouseNdc: MouseNdc | null,
    dt: number,
    camera: THREE.Camera,
  ): void {
    if (!mouseNdc || this.config.reducedMotion || this.falling) return;
    this.current.setNdc(mouseNdc.x, mouseNdc.y);
    this.current.apply(this.body, dt, camera);
  }

  private applyAmbientTurbulence(dt: number): void {
    if (this.config.reducedMotion || this.config.ambientAmp === 0 || this.falling) return;
    const t = this.elapsedSec * this.config.ambientFreq + this.config.ambientPhase;
    const ax = Math.sin(t) * this.config.ambientAmp;
    const ay = Math.cos(t * 0.83) * this.config.ambientAmp * 0.6;
    this.impulseScratch.set(ax * dt, ay * dt, 0);
    this.body.applyLinearImpulse(this.impulseScratch);
  }

  private randomOmega3(): Vec3 {
    const r = this.config.entranceOmegaRange;
    return {
      x: (Math.random() * 2 - 1) * r,
      y: (Math.random() * 2 - 1) * r,
      z: (Math.random() * 2 - 1) * r,
    };
  }

  /** Builds the bubble-spawn callback once; reused across emissions. It
   *  samples a random unit-cube edge point and transforms it through the
   *  inner group's current world matrix, so emission follows both the
   *  cube's position AND its tumbling orientation. */
  private createSpawnProvider(): BubbleSpawnProvider {
    const inner = this.config.inner;
    const localPoint = new THREE.Vector3();
    return {
      samplePosition: (out: THREE.Vector3) => {
        sampleUnitCubeEdge(localPoint);
        out.copy(localPoint).applyMatrix4(inner.matrixWorld);
      },
      sampleSourceVelocity: (out: THREE.Vector3) => {
        this.body.getVelocity(out);
      },
    };
  }

  private seedFor(position: Vec3, velocity: Vec3, omega: Vec3) {
    return {
      position: vec3(position),
      velocity: vec3(velocity),
      omegaX: omega.x,
      omegaY: omega.y,
      omegaZ: omega.z,
      eulerPitch: this.config.restEulerPitch,
      eulerYaw: this.config.restEulerYaw,
      eulerRoll: this.config.restEulerRoll,
    };
  }
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

function vec3(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z);
}
