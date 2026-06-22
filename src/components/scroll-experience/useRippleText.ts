"use client";

import { useEffect, useRef } from "react";
import { RippleText } from "./RippleText";
import type { RippleTextOptions } from "./RippleText";

/**
 * Decorates an existing DOM element (via ref) with the gelatinous ripple
 * displacement filter. Call once per text element — the hook manages
 * lifecycle, mouse tracking, and the per-frame spring integration.
 *
 * The element's existing styles, classes, and scroll-driven transforms
 * are untouched. The ripple is purely additive via `style.filter`.
 */
export function useRippleText(
  ref: React.RefObject<HTMLElement | null>,
  options?: RippleTextOptions,
): void {
  const instanceRef = useRef<RippleText | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rt = new RippleText(el, options);
    instanceRef.current = rt;

    const onMouse = (e: MouseEvent) => rt.updateMouse(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMouse, { passive: true });

    let prev = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const delta = Math.min((now - prev) / 1000, 0.064);
      prev = now;
      rt.tick(delta);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      rt.destroy();
      instanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
