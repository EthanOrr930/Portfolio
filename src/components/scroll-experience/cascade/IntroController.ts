// Clamp a huge first-frame delta (tab refocus / slow mount) so the intro never
// skips most of its run in a single step.
const INTRO_MAX_STEP_S = 0.05;

// ── Rotation (the "main body") ────────────────────────────────────────────────
// Runs on its own short timeline: starts at full angular speed and decelerates
// onto its final angle (0) with no overshoot.
const SPIN_TIME_S = 1.25;
// Total Y-axis sweep (radians). Flip the sign to reverse direction; change the
// magnitude for a bigger/smaller sweep.
const SPIN_TOTAL_RAD = -Math.PI / 6; // 30°, reversed direction
// Deceleration sharpness: remaining angle follows (1 − t)^power, decelerating
// into a soft stop. Higher = harder slow-down with a longer, gentler tail;
// 1 = linear (abrupt stop).
const DECEL_POWER = 3;

// ── Particle assemble — an independent damped spring ──────────────────────────
// Ticked on its OWN real-seconds clock (decoupled from the rotation) so it can
// ring down and settle smoothly instead of being cut to the spin's stop. Released
// from the scattered cloud with an initial inward velocity — the one deliberate
// "hard start" — then underdamped: it overshoots once, rings down, and its
// velocity decays to zero (no hard stop). x(t) = 1 − e^(−σt)[cos(ω_d t) +
// B sin(ω_d t)], with σ = ζ·ω_n, ω_d = ω_n√(1−ζ²), B = (σ − v0)/ω_d.
const PARTICLE_FREQ = 5;       // ω_n — natural frequency (rad/s); lower = slower / longer assemble
const PARTICLE_DAMPING = 0.6;  // ζ — lower = more overshoot / more ring
const PARTICLE_INIT_VEL = 1;   // v0 — initial fly-in speed (units/s) at t=0
// Seconds after which the spring is treated as fully settled (residual < 0.2%).
const PARTICLE_SETTLE_S = 2.2;

const PARTICLE_SIGMA = PARTICLE_DAMPING * PARTICLE_FREQ;
const PARTICLE_WD =
  PARTICLE_FREQ * Math.sqrt(1 - PARTICLE_DAMPING * PARTICLE_DAMPING);
const PARTICLE_B = (PARTICLE_SIGMA - PARTICLE_INIT_VEL) / PARTICLE_WD;

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// Remaining-angle fraction for the spin's deceleration: (1 − t)^power. Starts at
// 1, reaches exactly 0 at t=1 with zero terminal velocity (for power > 1), so the
// spin slows hard and lands on a soft stop — sharper the larger DECEL_POWER.
function decelRemaining(t: number): number {
  return Math.pow(1 - clamp01(t), DECEL_POWER);
}

// Underdamped spring position (0 → 1) released from 0 with PARTICLE_INIT_VEL.
// Overshoots once, rings down, velocity → 0 — smooth, no hard stop. Input is real
// seconds, NOT a normalized 0–1 (this is the particles' own timeline).
function particleAssemble(seconds: number): number {
  const t = seconds < 0 ? 0 : seconds;
  return (
    1 -
    Math.exp(-PARTICLE_SIGMA * t) *
      (Math.cos(PARTICLE_WD * t) + PARTICLE_B * Math.sin(PARTICLE_WD * t))
  );
}

/**
 * One-shot load intro for the particle figure. Holds a private clock that
 * advances each frame and exposes two derived, read-only signals on independent
 * timelines:
 *
 *   flyIn      0 → 1  — assemble amount (drives u_introProgress; 0 = particles
 *                       scattered outward, 1 = settled). An independent damped
 *                       spring: launches with an initial velocity, overshoots,
 *                       rings down to a smooth velocity-free stop.
 *   spinAngle  rad    — Y-rotation the "main body" carries. Decelerates from
 *                       SPIN_TOTAL_RAD → 0 over SPIN_TIME_S (no overshoot), then
 *                       rests while the particle spring finishes settling.
 *
 * Both sit at their resting value (1 / 0) once the clock passes the settle time,
 * so downstream scroll/fall behaviour is untouched. Reduced-motion collapses the
 * duration to 0 — the figure is simply present, no fly-in, no spin.
 */
export class IntroController {
  private elapsed = 0;
  private readonly duration: number;

  constructor(reducedMotion: boolean) {
    this.duration = reducedMotion ? 0 : Math.max(SPIN_TIME_S, PARTICLE_SETTLE_S);
  }

  advance(delta: number): void {
    if (this.done) return;
    this.elapsed += Math.min(delta, INTRO_MAX_STEP_S);
  }

  get done(): boolean {
    return this.elapsed >= this.duration;
  }

  /** Assemble amount (0 = scattered, 1 = settled). Independent damped spring:
   *  initial-velocity launch, one overshoot, rings down to a soft stop. */
  get flyIn(): number {
    if (this.done) return 1;
    return particleAssemble(this.elapsed);
  }

  /** Y-axis spin offset in radians — decelerates into a soft stop at SPIN_TIME_S
   *  (sharpness = DECEL_POWER), no overshoot, then rests at 0. */
  get spinAngle(): number {
    if (this.done) return 0;
    return SPIN_TOTAL_RAD * decelRemaining(this.elapsed / SPIN_TIME_S);
  }
}
