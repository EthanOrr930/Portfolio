import * as THREE from "three";

/**
 * Gelatinous mouse-push physics for the cascade particles.
 *
 * Two collaborating objects:
 *   - MouseVelocityTracker keeps a smoothed cursor position + velocity in NDC.
 *   - GelatinousField converts that into a per-particle push force along the
 *     camera-facing plane, balanced by a restoring spring so particles jiggle
 *     back home instead of spiraling around the cursor.
 */

export interface GelatinousConfig {
  /** Cursor radius in NDC half-screen units. */
  radius: number;
  /** Push accel scalar multiplied by mouse velocity magnitude. */
  pushStrength: number;
  /** Restoring spring strength pulling particles back to their home. */
  spring: number;
  /** Velocity damping — higher = stiffer, lower = wobblier. */
  drag: number;
  /** Hard cap on per-particle displacement in model space. */
  maxOffset: number;
  /** Hard cap on per-particle speed. */
  terminalVelocity: number;
  /** Torque scalar — how hard the mouse push spins particles. */
  torqueStrength: number;
  /** Angular drag — how quickly spin decays back to the idle drift. */
  angularDrag: number;
  /** Max angular speed (rad/s) cap so particles can't whirl forever. */
  maxAngularSpeed: number;
  /** Radial push AWAY from the cursor based on proximity alone (no velocity
   *  needed). Default 0 — the cascade stays purely velocity-driven; the voxel
   *  jelly turns this up so it reacts to a still, hovering cursor. */
  proximityStrength?: number;
}

export const DEFAULT_GELATINOUS_CONFIG: GelatinousConfig = {
  radius: 0.3,
  pushStrength: 4.0,
  spring: 18,
  drag: 4.5,
  maxOffset: 1.5,
  terminalVelocity: 2.5,
  torqueStrength: 22.0,
  angularDrag: 2.0,
  maxAngularSpeed: 12.0,
};

/**
 * Tracks the mouse in NDC and computes a smoothed velocity.
 * Position is lerped toward the latest input; velocity is derived from the
 * smoothed position's frame-to-frame delta so micro-jitter doesn't reach the
 * physics integrator.
 */
export class MouseVelocityTracker {
  readonly target = new THREE.Vector2();
  readonly position = new THREE.Vector2();
  readonly velocity = new THREE.Vector2();
  active = false;

  private readonly prevPosition = new THREE.Vector2();

  /** Push a new raw NDC sample from a mouse event. */
  setTarget(ndcX: number, ndcY: number): void {
    this.target.set(ndcX, ndcY);
    if (!this.active) {
      this.position.copy(this.target);
      this.prevPosition.copy(this.target);
      this.active = true;
    }
  }

  /** Advance the smoothed position + velocity one frame. */
  update(delta: number): void {
    if (!this.active || delta <= 0) return;
    const posLerp = 1 - Math.pow(1 - 0.25, delta * 60);
    this.prevPosition.copy(this.position);
    this.position.lerp(this.target, posLerp);

    const instVx = (this.position.x - this.prevPosition.x) / delta;
    const instVy = (this.position.y - this.prevPosition.y) / delta;
    // Smooth velocity so a single jittery frame doesn't explode the push.
    const velLerp = 1 - Math.pow(1 - 0.3, delta * 60);
    this.velocity.x += (instVx - this.velocity.x) * velLerp;
    this.velocity.y += (instVy - this.velocity.y) * velLerp;
  }
}

/**
 * Per-frame push field. Call prepare(camera, mesh, tracker) once, then call
 * integrate(...) for every particle. The field owns its scratch matrices so
 * the consumer stays allocation-free in the hot loop.
 */
export class GelatinousField {
  readonly config: GelatinousConfig;

  private readonly projMat = new THREE.Matrix4();
  private readonly invMesh = new THREE.Matrix4();
  private readonly camRight = new THREE.Vector3();
  private readonly camUp = new THREE.Vector3();
  private readonly camRightLocal = new THREE.Vector3(); // screen-right in mesh space
  private readonly camUpLocal = new THREE.Vector3(); // screen-up in mesh space
  private readonly pushWorld = new THREE.Vector3();
  private readonly pushLocal = new THREE.Vector3(); // direction + magnitude

  private radiusSq = 0;

  constructor(config: GelatinousConfig = DEFAULT_GELATINOUS_CONFIG) {
    this.config = config;
    this.radiusSq = config.radius * config.radius;
  }

  /**
   * Rebuild matrices and compute this frame's push vector in mesh-local space.
   * Must be called before integrate() each frame.
   */
  prepare(
    camera: THREE.Camera,
    mesh: THREE.Object3D,
    tracker: MouseVelocityTracker,
  ): void {
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    mesh.updateWorldMatrix(true, false);
    this.invMesh.copy(mesh.matrixWorld).invert();

    this.projMat
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .multiply(mesh.matrixWorld);

    // Push direction in world space = camera-right * Vx + camera-up * Vy.
    // This is what "move across the model" means when dragging the mouse.
    const el = camera.matrixWorld.elements;
    this.camRight.set(el[0], el[1], el[2]);
    this.camUp.set(el[4], el[5], el[6]);

    const strength = this.config.pushStrength;
    this.pushWorld
      .copy(this.camRight)
      .multiplyScalar(tracker.velocity.x * strength)
      .addScaledVector(this.camUp, tracker.velocity.y * strength);

    // Convert direction+magnitude into mesh-local space so spring (which
    // lives in mesh-local coords) and push stay in the same frame.
    this.pushLocal.copy(this.pushWorld).transformDirection(this.invMesh);
    // transformDirection normalizes; re-apply the magnitude we just computed.
    const mag = this.pushWorld.length();
    this.pushLocal.multiplyScalar(mag);

    // Unit screen-right / screen-up expressed in mesh-local space, so the
    // proximity push can shove voxels radially away from the cursor on screen.
    this.camRightLocal.copy(this.camRight).transformDirection(this.invMesh);
    this.camUpLocal.copy(this.camUp).transformDirection(this.invMesh);
  }

  /**
   * Semi-implicit Euler step for a single particle. Mutates offsets[i],
   * velocities[i], and (if provided) angVelocities[i] in place.
   *
   * baseX/Y/Z is the particle's rest (home) position in mesh-local space
   * this frame (after cascade interpolation).
   *
   * Returns the impulse falloff this particle felt (0 if outside cursor),
   * so the caller can use it as a torque multiplier on angular velocity.
   */
  integrate(
    index: number,
    baseX: number,
    baseY: number,
    baseZ: number,
    offsets: Float32Array,
    velocities: Float32Array,
    tracker: MouseVelocityTracker,
    delta: number,
  ): number {
    const i3 = index * 3;
    const cfg = this.config;

    let ox = offsets[i3];
    let oy = offsets[i3 + 1];
    let oz = offsets[i3 + 2];

    // Restoring spring pulling the particle home.
    let fx = -cfg.spring * ox;
    let fy = -cfg.spring * oy;
    let fz = -cfg.spring * oz;

    // Project the particle's current (displaced) position to NDC. Only
    // particles under the cursor feel the push force.
    let impulse = 0;
    if (tracker.active) {
      const cx = baseX + ox;
      const cy = baseY + oy;
      const cz = baseZ + oz;
      const pm = this.projMat.elements;
      const pxc = pm[0] * cx + pm[4] * cy + pm[8] * cz + pm[12];
      const pyc = pm[1] * cx + pm[5] * cy + pm[9] * cz + pm[13];
      const pwc = pm[3] * cx + pm[7] * cy + pm[11] * cz + pm[15];
      if (pwc > 0) {
        const ndx = pxc / pwc - tracker.position.x;
        const ndy = pyc / pwc - tracker.position.y;
        const ndcDistSq = ndx * ndx + ndy * ndy;
        if (ndcDistSq < this.radiusSq) {
          const dist = Math.sqrt(ndcDistSq);
          const falloff = 1 - dist / cfg.radius;
          const shaped = falloff * falloff;
          fx += this.pushLocal.x * shaped;
          fy += this.pushLocal.y * shaped;
          fz += this.pushLocal.z * shaped;
          // Velocity-independent radial shove away from the cursor.
          const prox = cfg.proximityStrength ?? 0;
          if (prox > 0 && dist > 1e-5) {
            const p = (prox * shaped) / dist;
            fx += (this.camRightLocal.x * ndx + this.camUpLocal.x * ndy) * p;
            fy += (this.camRightLocal.y * ndx + this.camUpLocal.y * ndy) * p;
            fz += (this.camRightLocal.z * ndx + this.camUpLocal.z * ndy) * p;
          }
          impulse = shaped;
        }
      }
    }

    let vx = velocities[i3];
    let vy = velocities[i3 + 1];
    let vz = velocities[i3 + 2];

    // Velocity-proportional drag.
    fx -= vx * cfg.drag;
    fy -= vy * cfg.drag;
    fz -= vz * cfg.drag;

    vx += fx * delta;
    vy += fy * delta;
    vz += fz * delta;

    const term = cfg.terminalVelocity;
    const speedSq = vx * vx + vy * vy + vz * vz;
    if (speedSq > term * term) {
      const invSpeed = term / Math.sqrt(speedSq);
      vx *= invSpeed;
      vy *= invSpeed;
      vz *= invSpeed;
    }

    ox += vx * delta;
    oy += vy * delta;
    oz += vz * delta;

    const maxOff = cfg.maxOffset;
    const offSq = ox * ox + oy * oy + oz * oz;
    if (offSq > maxOff * maxOff) {
      const invLen = maxOff / Math.sqrt(offSq);
      ox *= invLen;
      oy *= invLen;
      oz *= invLen;
      vx *= 0.3;
      vy *= 0.3;
      vz *= 0.3;
    }

    velocities[i3] = vx;
    velocities[i3 + 1] = vy;
    velocities[i3 + 2] = vz;
    offsets[i3] = ox;
    offsets[i3 + 1] = oy;
    offsets[i3 + 2] = oz;

    return impulse;
  }

  /**
   * Scalar angular integrator. Each particle has a single spin scalar
   * (extra rotation angle around its baked random axis) and a single
   * angular velocity.
   *
   * Spin direction is biased so it tracks the cursor: each particle
   * projects its random rotation axis onto the local push direction. Axes
   * aligned with the push get pumped with positive spin, anti-aligned axes
   * get negative spin — together this reads as the particle field rolling
   * in the direction of mouse motion.
   *
   * spinBoost[i] += angVel[i] * dt
   * angVel[i] *= exp(-angularDrag * dt) (after impulse contribution)
   */
  integrateAngular(
    index: number,
    impulse: number,
    randAxisX: number,
    randAxisY: number,
    randAxisZ: number,
    spinBoost: Float32Array,
    angVel: Float32Array,
    delta: number,
  ): void {
    const cfg = this.config;
    let av = angVel[index];

    if (impulse > 0) {
      // Dot product between this particle's spin axis and the local push
      // vector. Magnitude scales with push speed naturally because pushLocal
      // is already speed-weighted. The signed dot makes spin direction
      // follow the cursor motion.
      const projection =
        randAxisX * this.pushLocal.x +
        randAxisY * this.pushLocal.y +
        randAxisZ * this.pushLocal.z;
      av += projection * cfg.torqueStrength * impulse * delta;
    }

    // Angular drag — exponential decay back toward zero.
    av *= Math.exp(-cfg.angularDrag * delta);

    // Cap top speed.
    const maxA = cfg.maxAngularSpeed;
    if (av > maxA) av = maxA;
    else if (av < -maxA) av = -maxA;

    angVel[index] = av;
    spinBoost[index] += av * delta;
  }
}
