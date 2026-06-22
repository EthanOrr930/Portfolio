"use client";

import { forwardRef, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";
import { assetUrl } from "@/lib/assets";
import { RECORDER_OBJ_PARTS, RECORDER_SCALE } from "./recorderConstants";

const PART_URLS = RECORDER_OBJ_PARTS.map((n) =>
  assetUrl(`/models/recorder/${n}.obj`),
);

// Matte grey enclosure plastic — same family as the hydro/city ceramic.
const SHELL_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#c5c8ce",
  roughness: 0.58,
  metalness: 0.12,
});

interface RecorderModelProps {
  scale?: number;
  children?: React.ReactNode;
}

/**
 * Loads the three enclosure OBJ parts, re-materials them with matte plastic,
 * recenters the combined bounds to the origin, and scales mm → scene units.
 * Children (screen quad, LEDs, button) mount in the same recentered local
 * space so they line up with the front face.
 */
export const RecorderModel = forwardRef<THREE.Group, RecorderModelProps>(
  function RecorderModel({ scale = RECORDER_SCALE, children }, ref) {
    const parts = useLoader(OBJLoader, PART_URLS);

    const { shells, offset } = useMemo(() => {
      const wrap = new THREE.Group();
      for (const part of parts) {
        const clone = part.clone(true);
        clone.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            (node as THREE.Mesh).material = SHELL_MATERIAL;
          }
        });
        wrap.add(clone);
      }
      const center = new THREE.Box3().setFromObject(wrap).getCenter(
        new THREE.Vector3(),
      );
      return { shells: wrap, offset: center.negate() };
    }, [parts]);

    return (
      <group ref={ref} scale={scale}>
        <primitive object={shells} position={offset.toArray()} />
        <group position={offset.toArray()}>{children}</group>
      </group>
    );
  },
);
