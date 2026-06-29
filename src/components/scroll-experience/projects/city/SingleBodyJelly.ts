import * as THREE from "three";
import {
  GelatinousField,
  type GelatinousConfig,
  type MouseVelocityTracker,
} from "../../gelatinousPhysics";

/** Velocity push only — no torque, no proximity. Magnitudes are in world units
 *  (the body moves as one piece in scene space). */
export const DEFAULT_BOLT_JELLY_CONFIG: GelatinousConfig = {
  radius: 0.2,
  pushStrength: 70,
  spring: 12,
  drag: 4.5,
  maxOffset: 10,
  terminalVelocity: 70,
  torqueStrength: 0,
  angularDrag: 1,
  maxAngularSpeed: 0,
  proximityStrength: 0,
};

/**
 * Applies the cascade's gelatinous cursor-push to a SINGLE body (e.g. the laser
 * bolt) instead of per-voxel: when the cursor sweeps near it, it gets nudged
 * along the camera plane by the mouse velocity and springs back. Reuses
 * GelatinousField with a count of one and an identity "mesh", so the home and
 * offset are plain world-space coordinates.
 *
 * Stateful (owns the offset/velocity + field) → class. One concern: one body.
 */
export class SingleBodyJelly {
  private readonly field: GelatinousField;
  private readonly offset = new Float32Array(3);
  private readonly velocity = new Float32Array(3);
  private readonly dummy = new THREE.Object3D();
  private readonly result = new THREE.Vector3();

  constructor(config: GelatinousConfig = DEFAULT_BOLT_JELLY_CONFIG) {
    this.field = new GelatinousField(config);
  }

  /** Advance one frame and return the jelly offset for a body at `base`
   *  (world space). The caller adds this to the body's position. */
  apply(
    base: THREE.Vector3,
    camera: THREE.Camera,
    tracker: MouseVelocityTracker,
    delta: number,
  ): THREE.Vector3 {
    const dt = Math.min(delta, 0.033);
    tracker.update(dt);
    // field.prepare() calls dummy.updateWorldMatrix() before reading its
    // matrix, so an extra updateMatrixWorld() here would be redundant.
    this.field.prepare(camera, this.dummy, tracker);
    this.field.integrate(
      0,
      base.x, base.y, base.z,
      this.offset,
      this.velocity,
      tracker,
      dt,
    );
    return this.result.set(this.offset[0], this.offset[1], this.offset[2]);
  }
}
