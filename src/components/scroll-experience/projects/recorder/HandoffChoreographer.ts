import { curves, stepSpring, prefersReducedMotion, type SpringConfig } from "../../motionTokens";

// Device exits left (accelerating), then — after a beat — the laptop swings in
// from the right, spinning a half turn, overshoots center and springs back.
const EXIT_X = 44; // device travel off-screen left (clears wide/ultrawide screens)
const EXIT_DUR = 0.8; // device exit time
const ENTER_X = 65; // laptop start x (well off-screen right; it's big now)
const ENTER_STAGGER = 0.5; // beat between the device leaving and the laptop arriving
const SPIN_RAD = Math.PI; // half rotation as it flies in
const SPIN_DUR = 1.5; // spin + dolly decelerate to facing-camera over this long
const DEPTH_START = -30; // laptop starts this far further from the camera, dollies in
const DEV_EXIT_SPIN = Math.PI; // half spin on the device as it whips off-left
// Softer → gentler peak velocity; underdamped for a small overshoot, then settle.
const LAP_SPRING: SpringConfig = { stiffness: 22, damping: 6.4, mass: 1 };

export interface HandoffState {
  devX: number;
  devRotY: number;
  lapX: number;
  lapZ: number;
  lapRotY: number;
  dashboardLive: boolean;
  done: boolean;
}

const IDLE: HandoffState = { devX: 0, devRotY: 0, lapX: ENTER_X, lapZ: DEPTH_START, lapRotY: SPIN_RAD, dashboardLive: false, done: false };

/** The device→laptop handoff timeline. Pure (no R3F): `start()` then tick
 *  `update(dt)`; the scene applies the returned x positions to the two groups. */
export class HandoffChoreographer {
  private running = false;
  private t = 0;
  private lapVal = ENTER_X;
  private lapVel = 0;
  private reduced = false;

  get isRunning(): boolean {
    return this.running;
  }

  get laptopStartX(): number {
    return ENTER_X;
  }

  start(): void {
    this.running = true;
    this.t = 0;
    this.lapVal = ENTER_X;
    this.lapVel = 0;
    this.reduced = prefersReducedMotion();
  }

  /** Return to idle so a replayed section starts the handoff fresh. */
  reset(): void {
    this.running = false;
    this.t = 0;
    this.lapVal = ENTER_X;
    this.lapVel = 0;
    this.reduced = false;
  }

  update(dt: number): HandoffState {
    if (!this.running) return IDLE;
    if (this.reduced) return { devX: -EXIT_X, devRotY: 0, lapX: 0, lapZ: 0, lapRotY: 0, dashboardLive: true, done: true };
    this.t += dt;
    const exitE = curves.in(Math.min(1, this.t / EXIT_DUR)); // accelerate off-left
    const devX = -EXIT_X * exitE;
    const devRotY = DEV_EXIT_SPIN * exitE; // half spin synced to the whip-off
    const entryT = this.t - ENTER_STAGGER;
    if (entryT >= 0) {
      const s = stepSpring(this.lapVal, this.lapVel, 0, LAP_SPRING, dt); // overshoot + settle
      this.lapVal = s.value;
      this.lapVel = s.velocity;
    }
    const dollyE = curves.out(clamp01(entryT / SPIN_DUR)); // decelerating, synced to the spin
    const lapRotY = SPIN_RAD * (1 - dollyE); // half turn → faces camera
    const lapZ = DEPTH_START * (1 - dollyE); // dollies from far → rest while spinning
    const settled = Math.abs(this.lapVal) < 0.2 && Math.abs(this.lapVel) < 0.3;
    const dashboardLive = entryT >= SPIN_DUR && settled;
    return { devX, devRotY, lapX: this.lapVal, lapZ, lapRotY, dashboardLive, done: this.t / EXIT_DUR >= 1 && dashboardLive };
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
