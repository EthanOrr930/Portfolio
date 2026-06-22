import * as THREE from "three";

// Faithful to the firmware: the recording LEDs ramp green → yellow → red by
// time remaining, pulsing faster as it runs out. Demo sessions are short, so
// the thresholds are expressed as a FRACTION of the session (not absolute
// minutes) to tell the whole color story within the clip.
const GREEN = new THREE.Color("#2fd06a");
const YELLOW = new THREE.Color("#f1c40f");
const RED = new THREE.Color("#ff3b30");

const _out = new THREE.Color();

/** Solid color for the recording LEDs given remaining-time fraction (1→0). */
export function colorForTimeLeft(frac: number): THREE.Color {
  if (frac > 0.5) return _out.copy(GREEN);
  if (frac > 0.2) return _out.copy(YELLOW);
  return _out.copy(RED);
}

/** Breath pulse rate (Hz) — faster as time runs out. */
export function pulseRateForTimeLeft(frac: number): number {
  if (frac > 0.5) return 0.4;
  if (frac > 0.2) return 0.6;
  if (frac > 0) return 0.85;
  return 1.25; // overrun
}

/** 0..1 breathing envelope. */
export function breathe(clock: number, hz: number): number {
  return 0.5 + 0.5 * Math.sin(clock * hz * Math.PI * 2);
}
