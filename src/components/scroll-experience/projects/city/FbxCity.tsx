"use client";

import { useMemo } from "react";
import { useFBX } from "@react-three/drei";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

type GroupProps = ThreeElements["group"];

const CITY_FBX = "/models/destroyed-city.fbx";

// Same matte ceramic as the hydro cubes.
const CITY_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#f3ede1",
  roughness: 0.62,
  metalness: 0.04,
});

/**
 * Loads the CGTrader "optimized" destroyed-city FBX (the pre-arranged scene)
 * and overrides every mesh with the shared cube material — no textures.
 * Render inside <Suspense>. Named nodes survive the clone for later slicing.
 */
export function FbxCity(props: GroupProps) {
  const fbx = useFBX(CITY_FBX);
  const model = useMemo(() => {
    const clone = fbx.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = CITY_MATERIAL;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [fbx]);
  return <primitive object={model} {...props} />;
}

useFBX.preload(CITY_FBX);
