"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { BuildingSpec } from "./CityGenerator";
import { patchCityWindows } from "./cityWindowShader";

interface BuildingFieldProps {
  specs: readonly BuildingSpec[];
  color?: string;
}

/**
 * One InstancedMesh for every building. Each instance is a unit box scaled to
 * the spec's footprint/height; the window grid is drawn in-shader from
 * per-instance floor/column attributes. Flat-shaded gray clay for the
 * low-poly read.
 */
export function BuildingField({ specs, color = "#8f8d88" }: BuildingFieldProps) {
  const mesh = useMemo(() => buildMesh(specs, color), [specs, color]);
  return <primitive object={mesh} />;
}

function buildMesh(
  specs: readonly BuildingSpec[],
  color: string,
): THREE.InstancedMesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  attachInstanceAttributes(geometry, specs);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  });
  patchCityWindows(material);

  const mesh = new THREE.InstancedMesh(geometry, material, specs.length);
  writeMatrices(mesh, specs);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function attachInstanceAttributes(
  geometry: THREE.BufferGeometry,
  specs: readonly BuildingSpec[],
): void {
  const floors = new Float32Array(specs.length);
  const cols = new Float32Array(specs.length);
  const seeds = new Float32Array(specs.length);
  for (let i = 0; i < specs.length; i++) {
    floors[i] = specs[i].floors;
    cols[i] = specs[i].cols;
    seeds[i] = specs[i].seed;
  }
  geometry.setAttribute("aFloors", new THREE.InstancedBufferAttribute(floors, 1));
  geometry.setAttribute("aCols", new THREE.InstancedBufferAttribute(cols, 1));
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
}

function writeMatrices(
  mesh: THREE.InstancedMesh,
  specs: readonly BuildingSpec[],
): void {
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    pos.set(s.x, s.height / 2, s.z);
    scale.set(s.width, s.height, s.depth);
    m.compose(pos, quat, scale);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
