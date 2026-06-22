import * as THREE from "three";
import { curves, stepSpring, type SpringConfig } from "../../motionTokens";

const SENSITIVITY = 0.005; // radians per pixel of drag
const DAMP_PER_60 = 0.93; // momentum decay per 1/60s
const MIN_SPIN = 0.0008; // rad/s below which momentum stops

// Elastic upright: once a drag releases, roll (sideways tilt of the screen)
// springs all the way back to level while the facing direction (yaw/pitch) is
// preserved. A damped spring gives a smooth return that carries its own
// momentum in the correction direction (slight settle, no twitch).
const ROLL_K = 42; // spring stiffness
const ROLL_C = 9; // damping (zeta ~0.7 → a touch of momentum/overshoot)
// Roll-snapback settle deadzone — wide by default (won't auto-level a settled
// pose before the user touches it), tightening once they actually grab + drag
// (so a release snaps level cleanly).
export const ROLL_REST_OFF = 0.224;
export const ROLL_REST_ON = 0.004;
const ROLL_REST_VEL = 0.03; // rad/s — settle deadzone

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const WORLD_Y = new THREE.Vector3(0, 1, 0);
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _cup = new THREE.Vector3();
const _cross = new THREE.Vector3();
const _qStep = new THREE.Quaternion();
const _qSpin = new THREE.Quaternion();

/**
 * Free trackball rotation with inertia. Drag deltas accumulate into a
 * world-space incremental quaternion (premultiplied, so rotation is camera-
 * relative regardless of current orientation — no Euler/gimbal). On release the
 * last drag velocity carries on, decaying frame-rate-independently. `settleTo`
 * blends toward a hero pose for the scroll-in.
 */
export class TrackballRotationController {
  private readonly q = new THREE.Quaternion();
  private readonly dq = new THREE.Quaternion();
  private readonly axis = new THREE.Vector3(0, 1, 0);
  private accDx = 0;
  private accDy = 0;
  private dragging = false;
  private spinSpeed = 0;
  private rollVel = 0; // angular velocity of the roll-snapback spring
  private settleFrom: THREE.Quaternion | null = null;
  private settleTo: THREE.Quaternion | null = null;
  private settleT = 0;
  private settleDur = 1;
  private introTo: THREE.Quaternion | null = null;
  private introTurns = 0;
  private introT = 0;
  private introDur = 1;
  private settleBack = 0; // overshoot strength on the active settle (0 = smoothstep)
  private springMode = false; // settle driven by an underdamped spring (bouncy overshoot)
  private springVal = 0;
  private springVel = 0;
  private springCfg: SpringConfig = { stiffness: 110, damping: 6.5, mass: 1 };
  private rollRest = ROLL_REST_OFF; // active snapback deadzone (tightens on power-on)

  /** Tighten/loosen the roll-snapback deadzone (e.g. tight once powered on). */
  setRollDeadzone(rad: number): void {
    this.rollRest = rad;
  }

  beginDrag(): void {
    this.dragging = true;
    this.spinSpeed = 0;
    this.settleTo = null;
    this.introTo = null;
    this.springMode = false;
    this.rollRest = ROLL_REST_ON; // user took control → snap level on release
  }

  /** Cinematic intro: spin `turns` full rotations about world-Y, decelerating
   *  into `target` over `dur` seconds (the product-display fly-in). */
  introSpin(target: THREE.Quaternion, turns: number, dur: number): void {
    this.introTo = target.clone();
    this.introTurns = turns;
    this.introT = 0;
    this.introDur = Math.max(0.001, dur);
    this.spinSpeed = 0;
    this.dragging = false;
  }

  /** Snap orientation directly (used to seed free-rotation after the intro). */
  setOrientation(q: THREE.Quaternion): void {
    this.q.copy(q);
    this.spinSpeed = 0;
    this.rollVel = 0;
    this.accDx = 0;
    this.accDy = 0;
    this.settleTo = null;
    this.introTo = null;
    this.springMode = false;
  }

  addDelta(dx: number, dy: number): void {
    this.accDx += dx;
    this.accDy += dy;
  }

  endDrag(): void {
    this.dragging = false; // momentum continues from last frame's velocity
  }

  /** Animate from current orientation to `target` over `dur` seconds.
   *  `backStrength` > 0 swings momentum past the target then settles back
   *  (easeOutBack); higher = a bigger overshoot. 0 = plain smoothstep. */
  settle(target: THREE.Quaternion, dur: number, backStrength = 0): void {
    this.settleFrom = this.q.clone();
    this.settleTo = target.clone();
    this.settleT = 0;
    this.settleDur = Math.max(0.0001, dur);
    this.settleBack = backStrength;
    this.springMode = false;
    this.introTo = null;
  }

  /** Animate to `target` via an underdamped spring — swings past, then settles
   *  back (a pronounced, springy overshoot). `config` sets the bounce. */
  settleSpring(target: THREE.Quaternion, config: SpringConfig = this.springCfg): void {
    this.settleFrom = this.q.clone();
    this.settleTo = target.clone();
    this.springVal = 0;
    this.springVel = 0;
    this.springCfg = config;
    this.springMode = true;
    this.introTo = null;
  }

  update(dt: number, out: THREE.Quaternion): void {
    if (this.introTo) {
      this.introT = Math.min(this.introDur, this.introT + dt);
      const p = this.introT / this.introDur;
      const extra = (1 - curves.out(p)) * this.introTurns * Math.PI * 2; // decelerating
      _qSpin.setFromAxisAngle(WORLD_Y, extra);
      this.q.multiplyQuaternions(_qSpin, this.introTo); // hero pose, spun about Y
      if (p >= 1) this.introTo = null;
      out.copy(this.q);
      return;
    }
    if (this.settleTo && this.settleFrom && this.springMode) {
      const s = stepSpring(this.springVal, this.springVel, 1, this.springCfg, dt);
      this.springVal = s.value;
      this.springVel = s.velocity;
      this.q.slerpQuaternions(this.settleFrom, this.settleTo, this.springVal); // val>1 over-rotates
      if (Math.abs(this.springVal - 1) < 0.002 && Math.abs(this.springVel) < 0.01) {
        this.q.copy(this.settleTo);
        this.settleTo = null;
        this.springMode = false;
      }
      out.copy(this.q);
      return;
    }
    if (this.settleTo && this.settleFrom) {
      this.settleT = Math.min(1, this.settleT + dt / this.settleDur);
      const e = this.settleBack > 0 ? easeOutBack(this.settleT, this.settleBack) : smoothstep(this.settleT);
      this.q.slerpQuaternions(this.settleFrom, this.settleTo, e); // e>1 over-rotates then settles
      if (this.settleT >= 1) this.settleTo = null;
      out.copy(this.q);
      return;
    }
    // Apply any pending drag (even if the press already released this frame).
    if (this.accDx || this.accDy) this.applyAccumulated(dt);
    if (!this.dragging) {
      if (this.spinSpeed > MIN_SPIN) {
        this.dq.setFromAxisAngle(this.axis, this.spinSpeed * dt);
        this.q.premultiply(this.dq);
        this.spinSpeed *= Math.pow(DAMP_PER_60, dt * 60);
      }
      this.correctRoll(dt); // elastic snapback of sideways tilt
    }
    out.copy(this.q);
  }

  /** Damped-spring snapback of roll to level (keeps facing direction). */
  private correctRoll(dt: number): void {
    _fwd.set(0, 0, 1).applyQuaternion(this.q);
    _up.set(0, 1, 0).applyQuaternion(this.q);
    _cup.copy(WORLD_UP).addScaledVector(_fwd, -WORLD_UP.dot(_fwd));
    if (_cup.lengthSq() < 1e-3) {
      this.rollVel = 0;
      return; // facing nearly straight up/down — no defined roll
    }
    _cup.normalize();
    // signed roll error: angle to rotate `up` onto `cup` about the facing axis
    const dot = Math.min(1, Math.max(-1, _up.dot(_cup)));
    let err = Math.acos(dot);
    if (_cross.crossVectors(_up, _cup).dot(_fwd) < 0) err = -err;
    if (Math.abs(err) < this.rollRest && Math.abs(this.rollVel) < ROLL_REST_VEL) {
      this.rollVel = 0;
      return; // settled
    }
    this.rollVel += (ROLL_K * err - ROLL_C * this.rollVel) * dt;
    _qStep.setFromAxisAngle(_fwd, this.rollVel * dt);
    this.q.premultiply(_qStep);
  }

  private applyAccumulated(dt: number): void {
    const angle = Math.hypot(this.accDx, this.accDy) * SENSITIVITY;
    this.axis.set(this.accDy, this.accDx, 0).normalize();
    this.dq.setFromAxisAngle(this.axis, angle);
    this.q.premultiply(this.dq);
    this.spinSpeed = angle / Math.max(dt, 1e-3); // velocity for release momentum
    this.accDx = 0;
    this.accDy = 0;
  }
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Eases to 1 with a momentum overshoot past it (then settles). Higher `c1` =
 *  bigger overshoot (1.70158 ≈ 10%). */
function easeOutBack(t: number, c1 = 1.70158): number {
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}
