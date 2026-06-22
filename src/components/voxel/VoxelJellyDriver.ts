import * as THREE from "three";
import {
  GelatinousField,
  type GelatinousConfig,
  type MouseVelocityTracker,
} from "../scroll-experience/gelatinousPhysics";

/** Matches the hero-cascade gelatinous feel: a PURE velocity push (drag along
 *  with the mouse, no hold required) with the hero's spring/drag. pushStrength
 *  and the speed/offset caps are ~5x the hero's because this mesh is scaled to
 *  0.2 — the push is applied in mesh-local units, so it needs the bump to land
 *  the same world-space displacement. proximityStrength stays 0 (the hold-to-
 *  react term is what made it feel sluggish). */
export const DEFAULT_VOXEL_JELLY_CONFIG: GelatinousConfig = {
  radius: 0.13,
  pushStrength: 480,
  spring: 18,
  drag: 4.5,
  maxOffset: 40,
  terminalVelocity: 280,
  torqueStrength: 110,
  angularDrag: 3.5,
  maxAngularSpeed: 34,
  proximityStrength: 0,
};

const MAX_DT = 0.033;
// Spin only fires for voxels within this fraction of the push radius — a much
// tighter area than the positional drag, so only voxels right under the cursor
// tumble.
const TORQUE_RADIUS_FRAC = 0.3;
const TAU = Math.PI * 2;
// Torsional spring + damping: unwinds each voxel's spin back to its ORIGINAL
// orientation as it returns home. Higher drag = settles faster, less wobble.
const ROT_SPRING = 16;
const ROT_DRAG = 6;
// Per-voxel outward kick so disturbed chunks fan apart (each along its own
// random direction) instead of sliding as a slab. Velocity-driven + gated to
// voxels under the cursor; the position spring reels them back home.
const SPREAD_STRENGTH = 20;

function unit(): THREE.Vector3 {
  return new THREE.Vector3();
}

function hash(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/**
 * Gives a voxel InstancedMesh the hero-cascade cursor feel: voxels under the
 * moving cursor are dragged along the camera plane (and shoved outward by
 * proximity), each tumbling around its own axis as it scatters. A position
 * spring pulls every voxel home and a torsional spring unwinds its rotation, so
 * the gun reassembles to its exact original pose.
 *
 * Stateful, owns buffers + a lifecycle → class. One concern: animating one mesh.
 */
export class VoxelJellyDriver {
  private readonly field: GelatinousField;
  private readonly offsets: Float32Array;
  private readonly velocities: Float32Array;
  private readonly axes: Float32Array; // count * 3 — unit spin axis per voxel
  private readonly spinGain: Float32Array; // count — signed per-voxel torque scale
  private readonly angle: Float32Array; // count — current spin angle
  private readonly angVel: Float32Array; // count — current spin rate
  private readonly count: number;
  private readonly matrix = new THREE.Matrix4();
  private readonly position = unit();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private readonly axis = unit();

  constructor(
    private readonly mesh: THREE.InstancedMesh,
    private readonly home: Float32Array,
    private readonly config: GelatinousConfig = DEFAULT_VOXEL_JELLY_CONFIG,
  ) {
    this.count = home.length / 3;
    this.field = new GelatinousField(config);
    this.offsets = new Float32Array(home.length);
    this.velocities = new Float32Array(home.length);
    this.axes = new Float32Array(home.length);
    this.spinGain = new Float32Array(this.count);
    this.angle = new Float32Array(this.count);
    this.angVel = new Float32Array(this.count);
    this.seedAxes();
  }

  /** Integrate every voxel for one frame and flush the instance matrices. */
  update(
    camera: THREE.Camera,
    tracker: MouseVelocityTracker,
    delta: number,
  ): void {
    // Advance the smoothed cursor position + velocity — the push is velocity
    // driven, so without this the field never sees any motion.
    tracker.update(delta);
    this.field.prepare(camera, this.mesh, tracker);
    const dt = Math.min(delta, MAX_DT);
    // Signed cursor sweep speed drives the spin — fast swipe = big kick, no
    // motion = no torque. This is what makes it velocity-driven, not positional.
    const drive = tracker.velocity.x + tracker.velocity.y;
    const speed = Math.hypot(tracker.velocity.x, tracker.velocity.y);
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const impulse = this.field.integrate(
        i,
        this.home[i3],
        this.home[i3 + 1],
        this.home[i3 + 2],
        this.offsets,
        this.velocities,
        tracker,
        dt,
      );
      this.addSpread(i3, impulse, speed, dt);
      this.stepSpin(i, impulse, drive, dt);
      this.writeInstance(i, i3);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Velocity-driven spin: the cursor's sweep speed kicks the angular velocity
   *  (gated to voxels right under the cursor), while a torsional spring + drag
   *  unwind it back to the ORIGINAL rotation as the voxel returns home. Angle
   *  wraps to [-PI, PI] so a full turn reads as identity and the return is short. */
  private stepSpin(index: number, impulse: number, drive: number, dt: number): void {
    let w = this.angVel[index];
    const a = this.angle[index];
    const kick =
      this.torqueFalloff(impulse) *
      drive *
      this.config.torqueStrength *
      this.spinGain[index];
    w += (kick - ROT_SPRING * a - ROT_DRAG * w) * dt;
    const max = this.config.maxAngularSpeed;
    if (w > max) w = max;
    else if (w < -max) w = -max;
    this.angVel[index] = w;
    this.angle[index] = (((a + w * dt + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  }

  /** Velocity-driven outward kick along each voxel's own random direction, so
   *  disturbed chunks fan apart. Gated under the cursor; the field's position
   *  spring pulls them back home. */
  private addSpread(i3: number, impulse: number, speed: number, dt: number): void {
    if (impulse <= 0) return;
    const s = impulse * speed * SPREAD_STRENGTH * dt;
    this.velocities[i3] += this.axes[i3] * s;
    this.velocities[i3 + 1] += this.axes[i3 + 1] * s;
    this.velocities[i3 + 2] += this.axes[i3 + 2] * s;
  }

  /** Re-shape the push impulse to a much tighter cursor radius so spin only
   *  affects voxels right under the cursor. The field's impulse is falloff²
   *  over config.radius, so recover the NDC distance and re-falloff over the
   *  smaller torque radius. */
  private torqueFalloff(impulse: number): number {
    if (impulse <= 0) return 0;
    const dist = (1 - Math.sqrt(impulse)) * this.config.radius;
    const t = 1 - dist / (this.config.radius * TORQUE_RADIUS_FRAC);
    return t > 0 ? t * t : 0;
  }

  private writeInstance(index: number, i3: number): void {
    this.position.set(
      this.home[i3] + this.offsets[i3],
      this.home[i3 + 1] + this.offsets[i3 + 1],
      this.home[i3 + 2] + this.offsets[i3 + 2],
    );
    this.axis.set(this.axes[i3], this.axes[i3 + 1], this.axes[i3 + 2]);
    this.quaternion.setFromAxisAngle(this.axis, this.angle[index]);
    this.matrix.compose(this.position, this.quaternion, this.scale);
    this.mesh.setMatrixAt(index, this.matrix);
  }

  /** Deterministic per-voxel randomness: a unit spin axis plus a signed torque
   *  gain, so each voxel tumbles a different direction AND a different amount. */
  private seedAxes(): void {
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      let x = hash(i * 1.1 + 0.3);
      let y = hash(i * 2.3 + 1.7);
      let z = hash(i * 3.7 + 4.2);
      const len = Math.hypot(x, y, z) || 1;
      x /= len;
      y /= len;
      z /= len;
      this.axes[i3] = x;
      this.axes[i3 + 1] = y;
      this.axes[i3 + 2] = z;
      const g = hash(i * 5.1 + 2.9);
      this.spinGain[i] = Math.sign(g) * (0.15 + Math.abs(g) * 2.2);
    }
  }
}
