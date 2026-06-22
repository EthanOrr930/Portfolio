"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Voxel } from "@/lib/voxel/types";

const CAPACITY = 20000;

interface VoxelMeshProps {
  voxels: readonly Voxel[];
  /** instanceId + event (carries face normal + point) for editor picking. */
  onPick?: (index: number, event: ThreeEvent<MouseEvent>) => void;
}

/**
 * Renders a voxel model as a single InstancedMesh of unit cubes with
 * per-instance color. Fixed capacity so adding voxels never remounts the mesh;
 * `count` tracks the live voxel total. Pure render + picking — no editing
 * state lives here.
 */
export function VoxelMesh({ voxels, onPick }: VoxelMeshProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      matrix.setPosition(v.x, v.y, v.z);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color.set(v.color));
    }
    mesh.count = voxels.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Raycasting tests the instance bounding sphere first — recompute it after
    // every edit or new/distant voxels won't be pickable.
    mesh.computeBoundingSphere();
    mesh.frustumCulled = false;
  }, [voxels]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, CAPACITY]}
      castShadow
      receiveShadow
      onClick={(e) => {
        if (!onPick || e.instanceId == null) return;
        e.stopPropagation();
        onPick(e.instanceId, e);
      }}
    />
  );
}
