"use client";

import { useEffect } from "react";
import { KeyframeTextBlock } from "./KeyframeTextBlock";
import { loadAllFonts } from "@/lib/pages/fontLoader";
import type { KeyframeData } from "@/lib/pages/types";
import type { ScrollState } from "./useScrollProgress";

interface TextOverlayProps {
  keyframes: KeyframeData[];
  scrollState: ScrollState;
}

/**
 * Compute visibility for each keyframe's text block.
 *
 * visibility = 0: hidden below (not yet scrolled to)
 * visibility = 1: fully visible (active keyframe)
 * visibility = 2: hidden above (scrolled past)
 *
 * During transitions, the outgoing keyframe goes 1→2 and the incoming goes 0→1.
 */
function computeVisibilities(
  keyframes: KeyframeData[],
  scrollState: ScrollState,
): number[] {
  const { activeIndex, transitionProgress } = scrollState;

  return keyframes.map((_, i) => {
    if (transitionProgress === 0) {
      if (i < activeIndex) return 2;
      if (i === activeIndex) return 1;
      return 0;
    }

    // During transition from activeIndex to activeIndex+1
    if (i < activeIndex) return 2;
    if (i === activeIndex) return 1 + transitionProgress; // 1→2 (fading out)
    if (i === activeIndex + 1) return transitionProgress; // 0→1 (fading in)
    return 0;
  });
}

export function TextOverlay({ keyframes, scrollState }: TextOverlayProps) {
  // Load all referenced fonts on mount
  useEffect(() => {
    const families = keyframes.flatMap((kf) =>
      kf.elements.map((el) => el.style.fontFamily),
    );
    loadAllFonts(families);
  }, [keyframes]);

  const visibilities = computeVisibilities(keyframes, scrollState);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {keyframes.map((kf, i) => (
        <KeyframeTextBlock
          key={kf.id}
          elements={kf.elements}
          visibility={visibilities[i]}
        />
      ))}
    </div>
  );
}
