import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MouseVelocityTracker } from "../../gelatinousPhysics";
import { SingleBodyJelly } from "./SingleBodyJelly";

export interface JellyApplier {
  /** Advance one frame; returns the world-space offset to add to the body. */
  apply(base: THREE.Vector3, camera: THREE.Camera, delta: number): THREE.Vector3;
}

/**
 * Wires the single-body gelatinous push: tracks the cursor in NDC and exposes
 * an `apply` the caller folds into a body's per-frame position. The apply is
 * called from the consumer's existing useFrame, so this hook only owns the
 * tracker + listener.
 */
export function useSingleBodyJelly(): JellyApplier {
  const { size } = useThree();
  const tracker = useMemo(() => new MouseVelocityTracker(), []);
  const jelly = useMemo(() => new SingleBodyJelly(), []);

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

  return useMemo(
    () => ({
      apply: (base, camera, delta) => jelly.apply(base, camera, tracker, delta),
    }),
    [jelly, tracker],
  );
}
