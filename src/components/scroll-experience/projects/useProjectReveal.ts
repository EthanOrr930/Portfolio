import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { ProjectPhase } from "./ProjectStageDriver";

export interface ProjectRevealWindow {
  /** Scroll vh where the project's content slides in. */
  revealVh: number;
  /** Scroll vh where the project's content slides out.
   *  Omit for the last project — no exit. */
  hideVh?: number;
}

/**
 * Reveal phase for one project. Listens on the same `scroll` event the
 * rest of the experience uses — no per-frame setState, no rAF loop.
 * Only flips state when a threshold is crossed.
 */
export function useProjectReveal(
  scrollVhRef: RefObject<number>,
  window: ProjectRevealWindow,
): ProjectPhase {
  const [phase, setPhase] = useState<ProjectPhase>("before");
  const { revealVh, hideVh } = window;

  useEffect(() => {
    function check(): void {
      const next = computePhase(scrollVhRef.current ?? 0, revealVh, hideVh);
      setPhase((prev) => (prev === next ? prev : next));
    }

    globalThis.window.addEventListener("scroll", check, { passive: true });
    check();
    return () => globalThis.window.removeEventListener("scroll", check);
  }, [scrollVhRef, revealVh, hideVh]);

  return phase;
}

function computePhase(
  vh: number,
  revealVh: number,
  hideVh: number | undefined,
): ProjectPhase {
  if (vh < revealVh) return "before";
  if (hideVh !== undefined && vh >= hideVh) return "after";
  return "revealed";
}
