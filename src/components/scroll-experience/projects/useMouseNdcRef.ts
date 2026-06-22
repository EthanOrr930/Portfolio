import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export interface MouseNdc {
  x: number;
  y: number;
}

/**
 * Registers a single window mousemove listener and writes NDC coords into
 * a stable ref. Designed to be created once near the root of the Projects
 * subtree and passed down to every project's driver — one listener total
 * for the whole scene.
 */
export function useMouseNdcRef(): RefObject<MouseNdc> {
  const ref = useRef<MouseNdc>({ x: 0, y: 0 });
  useEffect(() => {
    function handle(event: MouseEvent): void {
      ref.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      ref.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);
  return ref;
}
