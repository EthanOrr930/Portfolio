"use client";

import { useRef } from "react";
import type * as THREE from "three";

export interface TransformCaptureData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export function useTransformCapture() {
  const meshRef = useRef<THREE.Mesh | null>(null);

  function capture(): TransformCaptureData {
    const mesh = meshRef.current;
    if (!mesh) {
      return { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 };
    }
    return {
      position: [mesh.position.x, mesh.position.y, mesh.position.z],
      rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
      scale: mesh.scale.x,
    };
  }

  return { meshRef, capture };
}
