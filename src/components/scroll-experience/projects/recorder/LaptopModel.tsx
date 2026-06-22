"use client";

import { forwardRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { assetUrl } from "@/lib/assets";

const LAPTOP_GLB = assetUrl("/models/laptop/laptop.glb");

// Clean aluminium body — we re-material the whole model for a slim product look.
const BODY_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#c9ccd2",
  roughness: 0.42,
  metalness: 0.85,
});

interface LaptopModelProps {
  scale?: number;
  children?: React.ReactNode;
}

/**
 * Loads the laptop GLB, recenters + scales it, and re-materials it as brushed
 * aluminium. Children (the screen quad hosting the dashboard) mount in the same
 * recentered local space.
 */
export const LaptopModel = forwardRef<THREE.Group, LaptopModelProps>(
  function LaptopModel({ scale = 1, children }, ref) {
    const { scene } = useGLTF(LAPTOP_GLB);

    const { model, offset } = useMemo(() => {
      const clone = scene.clone(true);
      clone.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          (node as THREE.Mesh).material = BODY_MATERIAL;
        }
      });
      const center = new THREE.Box3().setFromObject(clone).getCenter(new THREE.Vector3());
      return { model: clone, offset: center.negate() };
    }, [scene]);

    return (
      <group ref={ref} scale={scale}>
        <primitive object={model} position={offset.toArray()} />
        <group position={offset.toArray()}>{children}</group>
      </group>
    );
  },
);

useGLTF.preload(LAPTOP_GLB);
