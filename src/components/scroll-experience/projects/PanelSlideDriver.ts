import type { RefObject } from "react";
import { curves } from "../motionTokens";

export interface PanelSlideConfig {
  panel: HTMLElement;
  scrollVhRef: RefObject<number>;
  startVh: number;
  slideDurationVh: number;
  reducedMotion: boolean;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Drives a scroll-linked slide-up of a fixed panel from translateY(100%) to 0.
 * Stateful — owns a requestAnimationFrame loop and mutates panel.style.
 * Entrance curve is expo-out (`curves.out`) so the panel arrives with
 * confident deceleration; reduced-motion users get a hard 50% snap-in.
 */
export class PanelSlideDriver {
  private rafHandle = 0;
  private running = false;

  constructor(private readonly config: PanelSlideConfig) {}

  start(): () => void {
    this.running = true;
    this.rafHandle = requestAnimationFrame(this.tick);
    return () => this.stop();
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafHandle);
  }

  private tick = (): void => {
    if (!this.running) return;
    const progress = this.computeProgress();
    const eased = this.easeProgress(progress);
    this.applyTransform(eased, progress);
    this.rafHandle = requestAnimationFrame(this.tick);
  };

  private computeProgress(): number {
    const { scrollVhRef, startVh, slideDurationVh } = this.config;
    const vh = scrollVhRef.current ?? 0;
    return clamp01((vh - startVh) / slideDurationVh);
  }

  private easeProgress(progress: number): number {
    if (this.config.reducedMotion) return progress >= 0.5 ? 1 : 0;
    return curves.out(progress);
  }

  private applyTransform(eased: number, progress: number): void {
    const panel = this.config.panel;
    const px = (1 - eased) * window.innerHeight;
    panel.style.transform = `translate3d(0, ${px}px, 0)`;
    panel.style.pointerEvents = progress > 0.5 ? "auto" : "none";
  }
}
