import { HOLD_SEC, FINALIZE_SEC } from "./recorderConstants";

export type RecorderState =
  | "BOOT"
  | "STANDBY"
  | "CONFIRM_START"
  | "RECORDING"
  | "CONFIRM_STOP"
  | "FINALIZING"
  | "DONE";

/** Power-on "starting up" splash duration (seconds). */
const BOOT_SEC = 2;

/** Default emulated session length (seconds) — overridden by the audio clip
 *  duration so the LED time-ramp spans the whole clip. */
const DEFAULT_SESSION_SEC = 80;

/**
 * The 5-state recorder lifecycle + timers. Pure logic, no rendering: ticked
 * once per frame via `update(dt)`. A press is reported with `beginHold()` and
 * released with `cancelHold()`; a hold that survives HOLD_SEC fires the
 * transition. `onStateChange` lets the scene start/stop audio + kick the
 * device→laptop handoff.
 */
export class RecorderStateMachine {
  private current: RecorderState = "STANDBY";
  private holdT = 0;
  private elapsed = 0;
  private finalizeT = 0;
  private bootT = 0;
  private sessionSec = DEFAULT_SESSION_SEC;

  onStateChange?: (prev: RecorderState, next: RecorderState) => void;

  get state(): RecorderState {
    return this.current;
  }

  /** 0..1 progress of the active hold (drives the OLED bar + LED fill). */
  get holdProgress(): number {
    return Math.min(1, this.holdT / HOLD_SEC);
  }

  get elapsedSec(): number {
    return this.elapsed;
  }

  get timeLeftSec(): number {
    return this.sessionSec - this.elapsed;
  }

  /** 1 → 0 across the session; <0 in overrun. Drives the LED color ramp. */
  get timeLeftFrac(): number {
    return this.timeLeftSec / this.sessionSec;
  }

  setSessionSeconds(sec: number): void {
    if (sec > 1) this.sessionSec = sec;
  }

  beginHold(): void {
    if (this.current === "STANDBY") this.transition("CONFIRM_START");
    else if (this.current === "RECORDING") this.transition("CONFIRM_STOP");
  }

  cancelHold(): void {
    if (this.current === "CONFIRM_START") this.transition("STANDBY");
    else if (this.current === "CONFIRM_STOP") this.transition("RECORDING");
  }

  /** External stop (e.g. audio clip ended) → finalize cleanly. */
  forceFinalize(): void {
    if (this.current === "RECORDING" || this.current === "CONFIRM_STOP") {
      this.transition("FINALIZING");
    }
  }

  /** Switched on → run the boot splash, then land in standby. */
  powerOn(): void {
    this.elapsed = 0;
    this.bootT = 0;
    this.transition("BOOT");
  }

  /** Switched off → abort whatever was happening (recording is lost). */
  powerOff(): void {
    this.elapsed = 0;
    this.transition("STANDBY");
  }

  update(dt: number): void {
    if (this.current === "BOOT") {
      this.bootT += dt;
      if (this.bootT >= BOOT_SEC) this.transition("STANDBY");
    } else if (this.current === "CONFIRM_START" || this.current === "CONFIRM_STOP") {
      this.holdT += dt;
      if (this.holdT >= HOLD_SEC) this.completeHold();
    } else if (this.current === "RECORDING") {
      this.elapsed += dt;
    } else if (this.current === "FINALIZING") {
      this.finalizeT += dt;
      if (this.finalizeT >= FINALIZE_SEC) this.transition("DONE");
    }
  }

  private completeHold(): void {
    if (this.current === "CONFIRM_START") {
      this.elapsed = 0;
      this.transition("RECORDING");
    } else {
      this.transition("FINALIZING");
    }
  }

  private transition(next: RecorderState): void {
    const prev = this.current;
    if (prev === next) return;
    this.current = next;
    this.holdT = 0;
    if (next === "FINALIZING") this.finalizeT = 0;
    this.onStateChange?.(prev, next);
  }
}
