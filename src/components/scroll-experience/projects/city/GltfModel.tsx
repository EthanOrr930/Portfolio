"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";

type GroupProps = ThreeElements["group"];

interface GltfModelProps extends GroupProps {
  /** Public path to a .glb/.gltf, e.g. "/models/city.glb". */
  url: string;
}

/**
 * Thin wrapper that loads a glTF/GLB and drops its scene into the tree.
 * Render inside <Suspense>. Position/scale/rotation pass through as group
 * props so the caller can place the model.
 */
export function GltfModel({ url, ...props }: GltfModelProps) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} {...props} />;
}
