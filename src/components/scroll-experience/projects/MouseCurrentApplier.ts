import * as THREE from "three";
import type { WaterPhysicsBody } from "./WaterPhysicsBody";

export interface MouseCurrentConfig {
  /** rad·s per unit NDC-velocity (mouse sweep). Drag eats most of it. */
  forceScale: number;
  /** Cube half-side in world coords — lever arm for the chosen corner
   *  in the r × F cross product. */
  cornerLeverArm: number;
  /** Moment of inertia about each axis — (1/6)·m·s² for a solid cube. */
  momentOfInertia: number;
  /** Smoothing factor (per 60Hz frame) on raw NDC position. */
  positionLerpAlphaPer60: number;
  /** Smoothing factor (per 60Hz frame) on derived velocity. */
  velocityLerpAlphaPer60: number;
}

/**
 * Translates smoothed mouse NDC velocity into a LINEAR + ANGULAR impulse
 * on a WaterPhysicsBody — modelling the mouse as a finger flicking the
 * cube at one of its eight corners. The cube translates and spins.
 *
 * Each apply():
 *   1. Smooths raw NDC → smoothed position + velocity.
 *   2. Projects the cube's current world position to NDC via the camera.
 *   3. Picks the corner whose local-space direction matches the signs of
 *      (mouseNDC - cubeNDC). Z always +1 (viewer side).
 *   4. Builds a world-space force F from mouse velocity.
 *   5. Applies linear impulse F·dt and angular impulse (r × F)·dt / I.
 */
export class MouseCurrentApplier {
  private targetX = 0;
  private targetY = 0;
  private smoothedX = 0;
  private smoothedY = 0;
  private prevSmoothedX = 0;
  private prevSmoothedY = 0;
  private velocityX = 0;
  private velocityY = 0;
  private active = false;
  private readonly linearImpulse = new THREE.Vector3();
  private readonly cubeNdc = new THREE.Vector3();

  constructor(private readonly config: MouseCurrentConfig) {}

  setNdc(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    if (!this.active) {
      this.smoothedX = x;
      this.smoothedY = y;
      this.prevSmoothedX = x;
      this.prevSmoothedY = y;
      this.active = true;
    }
  }

  apply(body: WaterPhysicsBody, delta: number, camera: THREE.Camera): void {
    if (!this.active || delta <= 0) return;
    this.advanceSmoothing(delta);
    const fx = this.velocityX * this.config.forceScale;
    const fy = this.velocityY * this.config.forceScale;
    this.applyLinear(body, fx, fy, delta);
    this.applyAngular(body, fx, fy, delta, camera);
  }

  private applyLinear(
    body: WaterPhysicsBody,
    fx: number,
    fy: number,
    delta: number,
  ): void {
    this.linearImpulse.set(fx * delta, fy * delta, 0);
    body.applyLinearImpulse(this.linearImpulse);
  }

  private applyAngular(
    body: WaterPhysicsBody,
    fx: number,
    fy: number,
    delta: number,
    camera: THREE.Camera,
  ): void {
    const corner = this.pickCornerDirection(body, camera);
    const arm = this.config.cornerLeverArm;
    const rx = corner.rx * arm;
    const ry = corner.ry * arm;
    const rz = corner.rz * arm;
    // τ = r × F with F = (fx, fy, 0):
    //   τ.x = -rz · fy, τ.y = rz · fx, τ.z = rx · fy - ry · fx
    const tauX = -rz * fy;
    const tauY = rz * fx;
    const tauZ = rx * fy - ry * fx;
    const invI = 1 / this.config.momentOfInertia;
    body.applyAngularImpulse(
      tauX * delta * invI,
      tauY * delta * invI,
      tauZ * delta * invI,
    );
  }

  /** Which corner of the cube the mouse is "pushing" — sign-wise in NDC.
   *  Returns unit direction {-1,+1} on each axis (Z always +1 since the
   *  viewer is on the +Z side). */
  private pickCornerDirection(
    body: WaterPhysicsBody,
    camera: THREE.Camera,
  ): { rx: -1 | 1; ry: -1 | 1; rz: -1 | 1 } {
    body.getPosition(this.cubeNdc);
    this.cubeNdc.project(camera);
    const dx = this.smoothedX - this.cubeNdc.x;
    const dy = this.smoothedY - this.cubeNdc.y;
    return {
      rx: dx >= 0 ? 1 : -1,
      ry: dy >= 0 ? 1 : -1,
      rz: 1,
    };
  }

  private advanceSmoothing(delta: number): void {
    const posAlpha = this.frameAlpha(this.config.positionLerpAlphaPer60, delta);
    this.prevSmoothedX = this.smoothedX;
    this.prevSmoothedY = this.smoothedY;
    this.smoothedX += (this.targetX - this.smoothedX) * posAlpha;
    this.smoothedY += (this.targetY - this.smoothedY) * posAlpha;

    const instVx = (this.smoothedX - this.prevSmoothedX) / delta;
    const instVy = (this.smoothedY - this.prevSmoothedY) / delta;
    const velAlpha = this.frameAlpha(this.config.velocityLerpAlphaPer60, delta);
    this.velocityX += (instVx - this.velocityX) * velAlpha;
    this.velocityY += (instVy - this.velocityY) * velAlpha;
  }

  private frameAlpha(alphaPer60: number, delta: number): number {
    return 1 - Math.pow(1 - alphaPer60, delta * 60);
  }
}
