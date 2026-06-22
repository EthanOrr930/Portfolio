// Laptop view constants. SCREEN_QUAD lives in the LaptopModel's recentered local
// space (tuned in /laptop-test); HTML_SCALE maps the fixed-px dashboard onto it.

export const LAPTOP_SCALE = 6; // full laptop (screen + keyboard) stays in frame
// Bring the laptop toward the camera (z≈26) for a close-up perspective, and rest
// it near centre so the whole laptop — keyboard included — reads.
export const LAPTOP_REST_Y = -0.5;
export const LAPTOP_REST_Z = 12.5;

export const DASHBOARD_PX = { width: 1100, height: 720 } as const;

export const SCREEN_QUAD = {
  pos: [0.02, 0.854, -0.717] as [number, number, number],
  rot: [-0.028, 0, 0] as [number, number, number], // x only — no yaw/roll skew
  scale: 1.076, // uniform scale of the whole screen group (quad + dashboard together)
  width: 1.6,
  // match the dashboard aspect (1100×720) so the DOM fills the quad without crop
  height: (1.6 * DASHBOARD_PX.height) / DASHBOARD_PX.width,
} as const;

// drei <Html transform> renders content via a fixed factor (≈40); the px→quad
// ratio is independent of the laptop's own scale. Tuned live in /laptop-test so
// the 1100px dashboard fills SCREEN_QUAD.
export const HTML_SCALE = 0.088;
