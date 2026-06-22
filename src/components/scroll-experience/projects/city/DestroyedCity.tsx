"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

type GroupProps = ThreeElements["group"];

const CITY_GLTF = "/models/destroyed-city/Destroyed_City.gltf";

// Same matte ceramic as the hydro cubes so the city reads as the same
// material family (and the scroll handoff stays seamless).
const CITY_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#f3ede1",
  roughness: 0.62,
  metalness: 0.04,
});

/**
 * Loads the purchased destroyed-city glTF and overrides every mesh with the
 * shared cube material. Render inside <Suspense>. The model's named nodes
 * (Building_01..14, Church, Debris_01..11) survive the clone so we can later
 * pick/place individual buildings for the composition.
 */
export function DestroyedCity(props: GroupProps) {
  const { scene } = useGLTF(CITY_GLTF);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) mesh.material = CITY_MATERIAL;
    });
    return clone;
  }, [scene]);
  return <primitive object={model} {...props} />;
}

useGLTF.preload(CITY_GLTF);
