"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Rng } from "./CityGenerator";

interface DebrisFieldProps {
  /** Number of debris chunks. */
  count?: number;
  /** Center of the rubble scatter. */
  center?: [number, number];
  /** Scatter radius. */
  radius?: number;
  seed?: number;
  color?: string;
}

/**
 * Scattered low-poly rubble — small randomly-rotated chunks strewn across the
 * plaza floor. One InstancedMesh of a chunky low-tri solid.
 */
export function DebrisField({
  count = 220,
  center = [2, 9],
  radius = 12,
  seed = 7,
  color = "#9a9893",
}: DebrisFieldProps) {
  const mesh = useMemo(
    () => buildDebris(count, center, radius, seed, color),
    [count, center, radius, seed, color],
  );
  return <primitive object={mesh} />;
}

function buildDebris(
  count: number,
  center: [number, number],
  radius: number,
  seed: number,
  color: string,
): THREE.InstancedMesh {
  // Low-poly angular chunk (icosahedron detail 0 = 20 faces).
  const geometry = new THREE.IcosahedronGeometry(0.5, 0);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.97,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  scatter(mesh, count, center, radius, seed);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function scatter(
  mesh: THREE.InstancedMesh,
  count: number,
  center: [number, number],
  radius: number,
  seed: number,
): void {
  const rng = new Rng(seed);
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = rng.next() * Math.PI * 2;
    const r = Math.sqrt(rng.next()) * radius;
    const size = rng.range(0.18, 0.9);
    pos.set(
      center[0] + Math.cos(a) * r,
      size * 0.35,
      center[1] + Math.sin(a) * r,
    );
    euler.set(rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28));
    quat.setFromEuler(euler);
    scale.set(size, size * rng.range(0.4, 0.9), size);
    m.compose(pos, quat, scale);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
