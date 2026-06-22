const MOVE_THRESHOLD_PX = 6; // beyond this a press becomes a rotate
const HOLD_DELAY_MS = 240; // press held longer than this (on screen) = hold, not tap

export interface ArbiterCallbacks {
  onHoldStart(): void;
  onHoldCancel(): void;
  onTap(): void;
  onDragStart(): void;
  onDragDelta(dx: number, dy: number): void;
  onDragEnd(): void;
}

/** Returns whether the press landed on the screen (hold/tap eligible). */
export type HitTest = (clientX: number, clientY: number) => boolean;

type Mode = "idle" | "pending" | "hold" | "drag";

/**
 * Classifies a pointer press into TAP (quick, on screen → cycle session), HOLD
 * (sustained, on screen → record), or DRAG (moved → rotate). Hold/tap only fire
 * when the press starts on the screen; a drag works from anywhere. `update` is
 * ticked each frame to detect the tap→hold threshold crossing.
 */
export class HoldDragArbiter {
  private mode: Mode = "idle";
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private downAt = 0;
  private onScreen = false;
  private activeId = -1;

  constructor(
    private readonly cb: ArbiterCallbacks,
    private readonly hitTest: HitTest,
  ) {}

  bind(el: HTMLElement): () => void {
    const down = (e: PointerEvent) => this.onDown(el, e);
    const move = (e: PointerEvent) => this.onMove(e);
    const up = (e: PointerEvent) => this.onUp(el, e);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }

  /** Detect the hold threshold (press held still on the screen past the delay). */
  update(nowMs: number): void {
    if (this.mode !== "pending" || !this.onScreen) return;
    if (nowMs - this.downAt >= HOLD_DELAY_MS) {
      this.mode = "hold";
      this.cb.onHoldStart();
    }
  }

  private onDown(el: HTMLElement, e: PointerEvent): void {
    if (this.mode !== "idle") return;
    this.mode = "pending";
    this.activeId = e.pointerId;
    this.startX = this.lastX = e.clientX;
    this.startY = this.lastY = e.clientY;
    this.downAt = performance.now();
    this.onScreen = this.hitTest(e.clientX, e.clientY);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // synthetic / already-released pointers — non-fatal
    }
  }

  private onMove(e: PointerEvent): void {
    if (e.pointerId !== this.activeId || this.mode === "idle") return;
    if (this.mode === "pending" || this.mode === "hold") {
      const dist = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
      if (dist < MOVE_THRESHOLD_PX) return;
      if (this.mode === "hold") this.cb.onHoldCancel();
      this.mode = "drag";
      this.cb.onDragStart();
    }
    this.cb.onDragDelta(e.clientX - this.lastX, e.clientY - this.lastY);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  private onUp(el: HTMLElement, e: PointerEvent): void {
    if (e.pointerId !== this.activeId) return;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      // non-fatal
    }
    if (this.mode === "drag") this.cb.onDragEnd();
    else if (this.mode === "hold") this.cb.onHoldCancel();
    else if (this.mode === "pending" && this.onScreen) this.cb.onTap();
    this.mode = "idle";
    this.activeId = -1;
  }
}
