import * as THREE from "three";

export interface WaterBodyConfig {
  /** Exponential linear velocity decay per second (higher = stickier). */
  linearDrag: number;
  /** Exponential angular velocity decay per second. */
  angularDrag: number;
  /** Weak spring pulling position back toward rest. Small — drag should
   *  dominate the feel; this just guarantees the cube settles on layout. */
  restSpringK: number;
}

export interface WaterBodySeed {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Initial angular velocity across all three axes so the entry tumble
   *  reads clearly and mouse-torque on corners can produce roll as well
   *  as pitch/yaw. */
  omegaX: number;
  omegaY: number;
  omegaZ: number;
  /** Base rest rotation applied at seed time. */
  eulerPitch: number;
  eulerYaw: number;
  eulerRoll: number;
}

const MAX_FRAME_DT = 0.033;

/**
 * Single-body integrator for a cube floating in water.
 *   - Linear: weak spring toward rest + exponential drag + external impulses.
 *   - Angular: 3-DOF Euler (pitch/yaw/roll), drag only, external impulses
 *     from off-center force application (r × F) feed the omega state.
 *
 * Stateful → class. One concern: integrating one cube.
 */
export class WaterPhysicsBody {
  private readonly pos = new THREE.Vector3();
  private readonly vel = new THREE.Vector3();
  private readonly rest = new THREE.Vector3();
  private omegaX = 0;
  private omegaY = 0;
  private omegaZ = 0;
  private eulerX = 0;
  private eulerY = 0;
  private eulerZ = 0;
  /** When true, drop under constant gravity — no spring, no drag — so the
   *  cube accelerates naturally off-screen instead of easing to a rest. */
  private falling = false;
  private gravity = 0;
  private readonly scratchEuler = new THREE.Euler();

  constructor(
    private readonly positionTarget: THREE.Object3D,
    private readonly rotationTarget: THREE.Object3D,
    private readonly config: WaterBodyConfig,
  ) {}

  seed(seed: WaterBodySeed, rest: THREE.Vector3): void {
    this.pos.copy(seed.position);
    this.vel.copy(seed.velocity);
    this.rest.copy(rest);
    this.omegaX = seed.omegaX;
    this.omegaY = seed.omegaY;
    this.omegaZ = seed.omegaZ;
    this.eulerX = seed.eulerPitch;
    this.eulerY = seed.eulerYaw;
    this.eulerZ = seed.eulerRoll;
    this.falling = false;
    this.writePosition();
    this.writeRotation();
  }

  setRest(rest: THREE.Vector3): void {
    this.rest.copy(rest);
  }

  /** Switch into free-fall: spring + drag are bypassed and only gravity acts,
   *  so the body keeps accelerating downward. Lateral/angular velocity carry
   *  over so the tumble continues as it drops. */
  startFall(gravity: number): void {
    this.falling = true;
    this.gravity = gravity;
  }

  snapToRest(): void {
    this.pos.copy(this.rest);
    this.vel.set(0, 0, 0);
    this.omegaX = 0;
    this.omegaY = 0;
    this.omegaZ = 0;
    this.writePosition();
    this.writeRotation();
  }

  applyLinearImpulse(impulse: THREE.Vector3): void {
    this.vel.add(impulse);
  }

  applyAngularImpulse(dx: number, dy: number, dz: number): void {
    this.omegaX += dx;
    this.omegaY += dy;
    this.omegaZ += dz;
  }

  getPosition(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.pos);
  }

  getVelocity(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.vel);
  }

  /** Current orientation as a quaternion (Euler XYZ — matches writeRotation). */
  getOrientation(out: THREE.Quaternion): THREE.Quaternion {
    this.scratchEuler.set(this.eulerX, this.eulerY, this.eulerZ, "XYZ");
    return out.setFromEuler(this.scratchEuler);
  }

  step(delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_DT);
    this.integrateLinear(dt);
    this.integrateAngular(dt);
    this.writePosition();
    this.writeRotation();
  }

  private integrateLinear(dt: number): void {
    if (this.falling) {
      this.vel.y -= this.gravity * dt;
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
      this.pos.z += this.vel.z * dt;
      return;
    }
    const k = this.config.restSpringK;
    const ax = -k * (this.pos.x - this.rest.x);
    const ay = -k * (this.pos.y - this.rest.y);
    const az = -k * (this.pos.z - this.rest.z);
    const dragFactor = Math.exp(-this.config.linearDrag * dt);
    this.vel.x = (this.vel.x + ax * dt) * dragFactor;
    this.vel.y = (this.vel.y + ay * dt) * dragFactor;
    this.vel.z = (this.vel.z + az * dt) * dragFactor;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;
  }

  private integrateAngular(dt: number): void {
    const drag = Math.exp(-this.config.angularDrag * dt);
    this.omegaX *= drag;
    this.omegaY *= drag;
    this.omegaZ *= drag;
    this.eulerX += this.omegaX * dt;
    this.eulerY += this.omegaY * dt;
    this.eulerZ += this.omegaZ * dt;
  }

  private writePosition(): void {
    this.positionTarget.position.copy(this.pos);
  }

  private writeRotation(): void {
    this.rotationTarget.rotation.set(this.eulerX, this.eulerY, this.eulerZ);
  }
}
