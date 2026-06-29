import { useCallback, useEffect, useState } from "react";

interface CarouselOptions {
  count: number;
  /** Auto-advance interval (ms); 0 disables. Pauses while `paused`. */
  autoplayMs?: number;
  paused?: boolean;
  enabled: boolean;
}

/**
 * Index state for the gallery carousel: wrapping prev/next/goto, arrow-key
 * navigation, and optional autoplay. UI-only state, so a hook (not a class).
 */
export function useCarousel({ count, autoplayMs = 0, paused = false, enabled }: CarouselOptions) {
  const [index, setIndex] = useState(0);

  const goto = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, next, prev]);

  useEffect(() => {
    if (!enabled || paused || autoplayMs <= 0) return;
    const id = window.setInterval(next, autoplayMs);
    return () => window.clearInterval(id);
  }, [enabled, paused, autoplayMs, next]);

  return { index, goto, next, prev };
}
