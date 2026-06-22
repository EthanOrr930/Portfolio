import type { RecorderState } from "./RecorderStateMachine";

export interface Callout {
  anchor: "switch" | "screen";
  text: string;
}

/** Seconds into a recording before the "hold to finish" hint appears. */
const STOP_PROMPT_AFTER = 3.5;

/**
 * The single guiding callout for the current device state — drives the user
 * through turn-on → record → finish. Returns null when no hint is needed
 * (booting, mid-gesture, finalizing, etc.).
 */
export function calloutForState(
  state: RecorderState,
  powered: boolean,
  elapsedSec: number,
): Callout | null {
  if (!powered) return { anchor: "switch", text: "Turn it on" };
  switch (state) {
    case "BOOT":
      return null; // no "Starting up" hint — let the boot animation speak
    case "STANDBY":
      return { anchor: "screen", text: "Hold to record" };
    case "RECORDING":
      return elapsedSec > STOP_PROMPT_AFTER
        ? { anchor: "screen", text: "Hold to finish" }
        : null;
    default:
      return null;
  }
}
