/**
 * Shared neumorphic ("soft UI") tokens + box-shadow builders for the Clad in
 * Plaid card and its in-browser player. Surface colour matches the city scene's
 * cream so the panels read as extruded from the backdrop rather than pasted on.
 *
 * Pure style helpers — no state, so plain functions.
 */
export const NEUMORPHIC = {
  surface: "#ece4d6",
  surfaceDeep: "#e4dacc",
  shadowDark: "rgba(120, 106, 82, 0.45)",
  shadowLight: "rgba(255, 253, 247, 0.9)",
  ink: "#2b2722",
  inkSoft: "#6b5e48",
  eyebrow: "#8c7c5e",
  accent: "#5b8fd6",
  accentDeep: "#3f6fae",
} as const;

/** Raised (extruded) shadow: light top-left, dark bottom-right. */
export function raised(offset = 9, blur = 22): string {
  return (
    `${offset}px ${offset}px ${blur}px ${NEUMORPHIC.shadowDark}, ` +
    `-${offset}px -${offset}px ${blur}px ${NEUMORPHIC.shadowLight}`
  );
}

/** Inset (pressed / carved) shadow — the raised pair, flipped inward. */
export function inset(offset = 6, blur = 14): string {
  return (
    `inset ${offset}px ${offset}px ${blur}px ${NEUMORPHIC.shadowDark}, ` +
    `inset -${offset}px -${offset}px ${blur}px ${NEUMORPHIC.shadowLight}`
  );
}
