"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import type { Voxel } from "@/lib/voxel/types";
import { useVoxelJelly } from "./useVoxelJelly";

type GroupProps = ThreeElements["group"];

// Colorize to the scene's warm tan ramp (duotone) instead of just
// desaturating — maps each voxel's brightness onto a dark-tan → cream
// gradient, then keeps a hint of the original hue for subtle identity.
const TAN_SHADOW = new THREE.Color("#5c5346");
const TAN_LIGHT = new THREE.Color("#f3ede1");
const KEEP_ORIGINAL = 0.16;

function colorize(hex: string, desaturate: number): THREE.Color {
  const c = new THREE.Color(hex);
  const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const tan = TAN_SHADOW.clone().lerp(TAN_LIGHT, lum);
  const out = tan.lerp(c, KEEP_ORIGINAL);
  if (desaturate > 0) {
    const g = 0.299 * out.r + 0.587 * out.g + 0.114 * out.b;
    out.lerp(new THREE.Color(g, g, g), desaturate);
  }
  return out;
}

interface VoxelBuild {
  mesh: THREE.InstancedMesh;
  /** Local muzzle position (front tip), base-aligned + scaled. */
  muzzle: THREE.Vector3;
  /** Per-instance rest positions in mesh-local space (count * 3), consumed by
   *  the optional gelatinous cursor interaction. */
  home: Float32Array;
}

/** Build an InstancedMesh from voxels: base on y=0, centred in x/z, scaled,
 *  desaturated, plus the muzzle anchor (front-most tip centroid). */
function buildMesh(voxels: readonly Voxel[], scale: number, desaturate: number): VoxelBuild {
  const xs = voxels.map((v) => v.x);
  const ys = voxels.map((v) => v.y);
  const zs = voxels.map((v) => v.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const minY = Math.min(...ys);

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.04 });
  const mesh = new THREE.InstancedMesh(geo, mat, voxels.length);
  mesh.scale.setScalar(scale);
  const m = new THREE.Matrix4();
  const home = new Float32Array(voxels.length * 3);
  voxels.forEach((v, i) => {
    const hx = v.x - cx;
    const hy = v.y - minY;
    const hz = v.z - cz;
    home[i * 3] = hx;
    home[i * 3 + 1] = hy;
    home[i * 3 + 2] = hz;
    m.setPosition(hx, hy, hz);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, colorize(v.color, desaturate));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Muzzle = centroid of the front-most (max z) voxels.
  const maxZ = Math.max(...zs);
  const front = voxels.filter((v) => v.z >= maxZ - 1);
  const mx = front.reduce((s, v) => s + (v.x - cx), 0) / front.length;
  const my = front.reduce((s, v) => s + (v.y - minY), 0) / front.length;
  const muzzle = new THREE.Vector3(mx, my, maxZ - cz).multiplyScalar(scale);

  return { mesh, muzzle, home };
}

interface VoxelModelProps extends GroupProps {
  url: string;
  scale?: number;
  /** Expose an anchor object at the muzzle (front tip) that tracks the model. */
  muzzleAnchorRef?: React.Ref<THREE.Object3D>;
  /** Show a debug sphere at the muzzle (placement harness only). */
  showMuzzleMarker?: boolean;
  /** Enable the gelatinous cursor-push (voxels quiver under the moving cursor,
   *  matching the cascade particles). */
  interactive?: boolean;
  /** Extra desaturation toward gray, 0..1. 0 keeps the warm tan duotone. */
  desaturate?: number;
}

/**
 * Loads a voxel JSON and renders it as a single desaturated InstancedMesh,
 * base-aligned to the group origin. For the gun, a muzzle anchor child tracks
 * the model so the scene can fire from it.
 */
export const VoxelModel = forwardRef<THREE.Group, VoxelModelProps>(
  function VoxelModel(
    {
      url,
      scale = 0.1,
      muzzleAnchorRef,
      showMuzzleMarker = false,
      interactive = false,
      desaturate = 0,
      ...groupProps
    },
    ref,
  ) {
    const [voxels, setVoxels] = useState<Voxel[] | null>(null);
    useEffect(() => {
      fetch(url, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setVoxels(Array.isArray(d.voxels) ? d.voxels : []))
        .catch(() => setVoxels([]));
    }, [url]);

    const build = useMemo(
      () => (voxels && voxels.length ? buildMesh(voxels, scale, desaturate) : null),
      [voxels, scale, desaturate],
    );

    useVoxelJelly(build, interactive);

    return (
      <group ref={ref} {...groupProps}>
        {build && <primitive object={build.mesh} />}
        {build && muzzleAnchorRef && (
          <object3D ref={muzzleAnchorRef} position={build.muzzle.toArray()}>
            {showMuzzleMarker && (
              <mesh>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshBasicMaterial color="#ff5a3c" />
              </mesh>
            )}
          </object3D>
        )}
      </group>
    );
  },
);
