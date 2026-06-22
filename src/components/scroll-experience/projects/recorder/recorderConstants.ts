// Shared tunables for the Session Recorder showcase (Project 03).
// Device local geometry (from the enclosure OBJs, in mm):
//   X[-28.5, 26]  Y[-28, 29]  Z[-26.1, 0]  → ~54.5 × 57 × 26 mm.
// The lid's top face (Z = 0) is the front: screen hole, 6-LED slit, button.

export const RECORDER_OBJ_PARTS = ["Body30", "Lidv2", "Seatv2"] as const;

/** Scene-unit scale applied to the mm geometry. */
export const RECORDER_SCALE = 0.12;

/** Hold duration (seconds) to start/stop recording. */
export const HOLD_SEC = 3;

/** Finalizing splash duration (seconds). */
export const FINALIZE_SEC = 1.2;

/** Number of status LEDs in the slit. */
export const LED_COUNT = 6;

// Front-face anchor placements in DEVICE-LOCAL mm (pre-scale, post-recenter).
// Recenter offset is computed at load; these are relative to the recentered
// origin. Tuned live against the rendered model (see recorder-test route).
// NOTE: child z=0 sits exactly on the front face; +z is proud of it. x/y are
// device-centered to within ~1mm. Tuned live against the rendered model.
export const SCREEN_ANCHOR = {
  // OLED fills the recessed front window. The OLED canvas matches this aspect
  // so the UI isn't stretched (content letterboxed in black).
  pos: [-1.12, 3.0, -0.99] as [number, number, number],
  width: 42.81,
  height: 24,
};

export const LED_SLIT = {
  // LEDs recessed INSIDE the case at the real slit in the face; their glow +
  // a small point light per LED shine out through the slit. March +X (L → R).
  startX: -18,
  y: -19.26,
  z: -1.6, // recessed inside the case
  pitch: 7.2,
  size: 1.3,
  bandWidth: 41,
  bandZ: -2.6, // dark interior wall behind the LEDs
  lightZ: -0.4, // point light sits near the slit mouth to spill onto the lip
};

export const SWITCH_ANCHOR = {
  // slide switch recessed into the hole on the right side wall, near the bottom.
  pos: [26.63, -14.73, -19.41] as [number, number, number],
  travel: 4.6, // nub slide distance between OFF and ON (clearly visible)
  trackLength: 9, // length of the black slide track
};
