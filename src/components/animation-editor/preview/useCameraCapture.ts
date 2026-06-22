"use client";

import { useRef, createContext, useContext } from "react";
import type { Camera } from "three";
import * as THREE from "three";

export interface CameraCaptureData {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
}

/**
 * Shared ref that allows the timeline's "Add Keyframe" button
 * to capture the current R3F camera state.
 */
export function useCameraCapture() {
  const cameraRef = useRef<Camera | null>(null);

  function capture(): CameraCaptureData {
    const cam = cameraRef.current;
    if (!cam) {
      return { position: [0, 0, 2.8], rotation: [0, 0, 0], fov: 50 };
    }
    return {
      position: [cam.position.x, cam.position.y, cam.position.z],
      rotation: [cam.rotation.x, cam.rotation.y, cam.rotation.z],
      fov: cam instanceof THREE.PerspectiveCamera ? cam.fov : 50,
    };
  }

  return { cameraRef, capture };
}
