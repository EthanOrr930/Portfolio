import { useState, useEffect, useCallback } from "react";
import type { KeyframeData } from "@/lib/pages/types";

export interface ScrollState {
  /** Index of the "source" keyframe (the one we're transitioning FROM) */
  activeIndex: number;
  /** 0..1 progress through the current transition (0 = fully on activeIndex, 1 = fully on activeIndex+1) */
  transitionProgress: number;
}

/**
 * Build a simple segment map — one transition segment per adjacent keyframe pair.
 * No hold segments, no auto-scroll.
 */
function buildSegments(keyframes: KeyframeData[]) {
  const segments: Array<{
    keyframeIndex: number;
    startVh: number;
    endVh: number;
  }> = [];

  let cursor = 0;

  // Each transition segment connects keyframe i-1 → i
  for (let i = 1; i < keyframes.length; i++) {
    const dur = keyframes[i].transition.scrollDuration;
    segments.push({
      keyframeIndex: i - 1,
      startVh: cursor,
      endVh: cursor + dur,
    });
    cursor += dur;
  }

  // totalVh is in scroll-space. scrollY maxes at (spacerHeight - viewport).
  // spacerHeight = totalVh * 100vh, so max scrollVh = totalVh - 1.
  // We need max scrollVh >= cursor, so totalVh >= cursor + 1.
  return { segments, totalVh: cursor + 1.1 };
}

export function useScrollProgress(keyframes: KeyframeData[] | null) {
  const [state, setState] = useState<ScrollState>({
    activeIndex: 0,
    transitionProgress: 0,
  });

  const [totalHeight, setTotalHeight] = useState(0);

  const segmentsRef = useCallback(() => {
    if (!keyframes || keyframes.length === 0) return null;
    return buildSegments(keyframes);
  }, [keyframes]);

  useEffect(() => {
    const built = segmentsRef();
    if (!built) return;

    setTotalHeight(built.totalVh);

    function onScroll() {
      const built = segmentsRef();
      if (!built) return;

      const scrollVh = window.scrollY / window.innerHeight;
      const { segments } = built;

      // Find which segment we're in
      for (const seg of segments) {
        if (scrollVh >= seg.startVh && scrollVh < seg.endVh) {
          const progress = (scrollVh - seg.startVh) / (seg.endVh - seg.startVh);
          setState({
            activeIndex: seg.keyframeIndex,
            transitionProgress: progress,
          });
          return;
        }
      }

      // Past the end — settled on last keyframe
      if (segments.length > 0) {
        const last = segments[segments.length - 1];
        setState({
          activeIndex: last.keyframeIndex,
          transitionProgress: 1,
        });
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [segmentsRef]);

  return { state, totalHeight };
}
