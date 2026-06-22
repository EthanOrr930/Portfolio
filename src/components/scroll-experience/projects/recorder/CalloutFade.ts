const FADE_MS = 350; // matches the CSS opacity transition on the callout DOM
const GAP_MS = 260; // dead beat between one leader fading out and the next fading in

type Decision = "write" | "hide";

/**
 * Drives the fade lifecycle of the tutorial callout so leaders fade OUT, pause,
 * then fade IN when the target text changes (and fade out when there's none).
 * Pure timing state — the caller maps the decision onto the DOM opacity/content.
 */
export class CalloutFade {
  private shownText = "";
  private state: "hidden" | "visible" | "out" = "hidden";
  private until = 0;

  /** Decide what to do this frame given the desired text (or null for none).
   *  "write" → set content + position and show; "hide" → opacity 0. */
  step(now: number, want: string | null): Decision {
    if (want === null) return this.toNone(now);
    if (this.state === "visible") {
      if (want === this.shownText) return "write"; // keep tracking the anchor
      this.state = "out"; // text changed → fade out, then back in after the gap
      this.until = now + FADE_MS + GAP_MS;
      return "hide";
    }
    if (this.state === "out" && now < this.until) return "hide"; // waiting out the gap
    this.shownText = want;
    this.state = "visible";
    return "write";
  }

  private toNone(now: number): Decision {
    if (this.state === "visible") {
      this.state = "out";
      this.until = now + FADE_MS;
    } else if (this.state === "out" && now >= this.until) {
      this.state = "hidden";
    }
    return "hide";
  }
}
