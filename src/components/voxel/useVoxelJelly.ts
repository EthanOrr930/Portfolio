import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MouseVelocityTracker } from "../scroll-experience/gelatinousPhysics";
import { VoxelJellyDriver } from "./VoxelJellyDriver";

interface JellyTarget {
  mesh: THREE.InstancedMesh;
  home: Float32Array;
}

/**
 * Wires the gelatinous cursor-push onto a voxel mesh: tracks the cursor in NDC
 * and drives per-voxel displacement each frame. A no-op when disabled or before
 * the mesh has built, so it is safe to call unconditionally.
 */
export function useVoxelJelly(
  target: JellyTarget | null,
  enabled: boolean,
): void {
  const { size } = useThree();
  const tracker = useMemo(() => new MouseVelocityTracker(), []);

  const driver = useMemo(
    () =>
      enabled && target ? new VoxelJellyDriver(target.mesh, target.home) : null,
    [enabled, target],
  );

  useEffect(() => {
    if (!enabled) return;
    const handle = (event: MouseEvent) => {
      tracker.setTarget(
        (event.clientX / size.width) * 2 - 1,
        -(event.clientY / size.height) * 2 + 1,
      );
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, [enabled, size, tracker]);

  useFrame((state, delta) => {
    if (driver) driver.update(state.camera, tracker, delta);
  });
}
