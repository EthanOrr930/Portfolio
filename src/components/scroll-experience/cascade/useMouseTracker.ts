import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { MouseVelocityTracker } from "../gelatinousPhysics";

/**
 * Subscribes to window mousemove and feeds the tracker NDC coordinates.
 * Re-subscribes when the canvas size changes so the NDC math stays correct.
 */
export function useMouseTracker(tracker: MouseVelocityTracker): void {
  const { size } = useThree();
  useEffect(() => {
    const handle = (event: MouseEvent) => {
      tracker.setTarget(
        (event.clientX / size.width) * 2 - 1,
        -(event.clientY / size.height) * 2 + 1,
      );
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, [size, tracker]);
}
