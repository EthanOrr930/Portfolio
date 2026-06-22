"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { Camera } from "three";

/**
 * R3F component that tracks the camera ref for external capture.
 */
export function CameraTracker({
  cameraRef,
}: {
  cameraRef: React.MutableRefObject<Camera | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    cameraRef.current = camera;
    return () => {
      cameraRef.current = null;
    };
  }, [camera, cameraRef]);

  return null;
}
