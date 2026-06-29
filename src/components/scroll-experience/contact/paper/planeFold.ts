import * as THREE from "three";
import { FOLD_KEYFRAMES, FOLD_INDEX } from "./planeFoldData";

/**
 * Builds the paper-plane geometry from Active Theory's baked fold keyframes.
 * Their mesh lives in the XZ plane (~21 units wide). We rotate it +90° about X
 * so it sits in the scene's XY plane facing the camera with the nose at +Y and
 * the fold relief toward the viewer (+Z), then scale to ~2 units wide.
 */
const TARGET_WIDTH = 2.0;
const RAW_WIDTH = 21; // AT flat sheet x ∈ [-10.5, 10.5]
const SCALE = TARGET_WIDTH / RAW_WIDTH;

function toSceneSpace(raw: number[]): Float32Array {
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i += 3) {
    out[i] = raw[i] * SCALE; //  x' = x
    out[i + 1] = -raw[i + 2] * SCALE; //  y' = -z  (Rx +90°)
    out[i + 2] = raw[i + 1] * SCALE; //  z' =  y
  }
  return out;
}

export interface FoldGeometry {
  geometry: THREE.BufferGeometry;
  /** Transformed fold stages, frames[0] = flat sheet → last = finished dart. */
  frames: Float32Array[];
}

export function buildFoldGeometry(): FoldGeometry {
  const frames = FOLD_KEYFRAMES.map(toSceneSpace);
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(FOLD_INDEX);
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(frames[0]), 3));
  geometry.computeVertexNormals();
  return { geometry, frames };
}
