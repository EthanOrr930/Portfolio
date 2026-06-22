import * as THREE from "three";

/** Minimal surface a cube body must expose for bounce resolution. */
export interface CollidableCube {
  getCenter(out: THREE.Vector3): THREE.Vector3;
  getOrientation(out: THREE.Quaternion): THREE.Quaternion;
  getVelocity(out: THREE.Vector3): THREE.Vector3;
  applyLinearImpulse(impulse: THREE.Vector3): void;
}

export interface CubeBounceConfig {
  /** Half edge length of each cube in the shared comparison space. */
  halfSize: number;
  /** 0 = no bounce, 1 = perfectly elastic. Keep low for a gentle tap. */
  restitution: number;
  /** Velocity push per unit penetration per second — keeps overlapping
   *  cubes drifting apart even when their relative velocity is ~0. */
  separationStrength: number;
  /** Penetrations below this (world units) are ignored as numerical noise. */
  slop: number;
}

const EPS = 1e-6;
const MAX_DT = 0.033;

function unit(): THREE.Vector3 {
  return new THREE.Vector3();
}

/**
 * Detects oriented-bounding-box overlap between two tumbling cubes via the
 * Separating Axis Theorem (15 axes: 3 faces each + 9 edge cross-products),
 * then resolves any real edge/corner intersection with a gentle velocity
 * bounce plus a soft de-penetration push. Equal mass is assumed, so the
 * impulse splits evenly between the pair.
 *
 * Stateful only in its reusable scratch vectors → one resolver per cube pair.
 */
export class CubeBounceResolver {
  private readonly cA = unit();
  private readonly cB = unit();
  private readonly vA = unit();
  private readonly vB = unit();
  private readonly qA = new THREE.Quaternion();
  private readonly qB = new THREE.Quaternion();
  private readonly delta = unit();
  private readonly normal = unit();
  private readonly impulse = unit();
  private readonly testAxis = unit();
  private readonly axesA: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [unit(), unit(), unit()];
  private readonly axesB: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [unit(), unit(), unit()];

  constructor(private readonly config: CubeBounceConfig) {}

  /** Resolve a collision between two cubes if their boxes overlap this frame. */
  resolve(a: CollidableCube, b: CollidableCube, dt: number): void {
    a.getCenter(this.cA);
    b.getCenter(this.cB);
    a.getOrientation(this.qA);
    b.getOrientation(this.qB);
    this.fillAxes(this.qA, this.axesA);
    this.fillAxes(this.qB, this.axesB);
    this.delta.subVectors(this.cB, this.cA);

    const depth = this.findMinPenetration();
    if (depth <= this.config.slop) return;

    a.getVelocity(this.vA);
    b.getVelocity(this.vB);
    this.applyBounce(a, b, depth, Math.min(dt, MAX_DT));
  }

  /** Local x/y/z basis of a cube expressed in the shared comparison space. */
  private fillAxes(
    q: THREE.Quaternion,
    out: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
  ): void {
    out[0].set(1, 0, 0).applyQuaternion(q);
    out[1].set(0, 1, 0).applyQuaternion(q);
    out[2].set(0, 0, 1).applyQuaternion(q);
  }

  /** SAT scan. Returns the smallest overlap depth and records its axis as the
   *  contact normal (oriented A→B), or -1 if any axis separates the boxes. */
  private findMinPenetration(): number {
    let best = Infinity;
    for (let i = 0; i < 3; i++) {
      best = this.consider(this.axesA[i], best);
      if (best < 0) return -1;
      best = this.consider(this.axesB[i], best);
      if (best < 0) return -1;
    }
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.testAxis.crossVectors(this.axesA[i], this.axesB[j]);
        if (this.testAxis.lengthSq() < EPS) continue;
        this.testAxis.normalize();
        best = this.consider(this.testAxis, best);
        if (best < 0) return -1;
      }
    }
    return best === Infinity ? -1 : best;
  }

  /** Test one separating axis: -1 if it separates the boxes, else the running
   *  minimum overlap (updating the contact normal when it tightens). */
  private consider(axis: THREE.Vector3, best: number): number {
    const sep = Math.abs(this.delta.dot(axis));
    const overlap = this.radius(this.axesA, axis) + this.radius(this.axesB, axis) - sep;
    if (overlap <= 0) return -1;
    if (overlap < best) {
      const sign = this.delta.dot(axis) < 0 ? -1 : 1;
      this.normal.copy(axis).multiplyScalar(sign);
      return overlap;
    }
    return best;
  }

  /** Projection radius of a cube onto an axis (sum of its half-extents). */
  private radius(
    axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
    axis: THREE.Vector3,
  ): number {
    const h = this.config.halfSize;
    return (
      h *
      (Math.abs(axes[0].dot(axis)) +
        Math.abs(axes[1].dot(axis)) +
        Math.abs(axes[2].dot(axis)))
    );
  }

  private applyBounce(
    a: CollidableCube,
    b: CollidableCube,
    depth: number,
    dt: number,
  ): void {
    const n = this.normal;
    const relAlongN =
      (this.vB.x - this.vA.x) * n.x +
      (this.vB.y - this.vA.y) * n.y +
      (this.vB.z - this.vA.z) * n.z;
    // Reflect only the approaching component; split evenly across equal masses.
    const bounce = relAlongN < 0 ? (-(1 + this.config.restitution) * relAlongN) * 0.5 : 0;
    const push = depth * this.config.separationStrength * dt * 0.5;
    const mag = bounce + push;
    if (mag <= 0) return;
    b.applyLinearImpulse(this.impulse.copy(n).multiplyScalar(mag));
    a.applyLinearImpulse(this.impulse.copy(n).multiplyScalar(-mag));
  }
}
