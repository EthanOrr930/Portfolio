import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function getExtension(source: File | string): string {
  const name = typeof source === "string" ? source : source.name;
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getUrl(source: File | string): { url: string; revoke: () => void } {
  if (typeof source === "string") {
    return { url: source, revoke: () => {} };
  }
  const url = URL.createObjectURL(source);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

function mergeGroup(group: THREE.Group): THREE.BufferGeometry | null {
  // Compute world matrices so child transforms are correctly accumulated.
  // Without this, freshly-loaded GLB scenes have identity matrixWorld on
  // every node, collapsing all mesh parts to the origin.
  group.updateMatrixWorld(true);

  const geometries: THREE.BufferGeometry[] = [];

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry.clone();
      geo.applyMatrix4(child.matrixWorld);
      geometries.push(geo);
    }
  });

  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0];

  let result = geometries[0];
  for (let i = 1; i < geometries.length; i++) {
    result = mergeTwo(result, geometries[i]);
  }
  return result;
}

function mergeTwo(
  a: THREE.BufferGeometry,
  b: THREE.BufferGeometry,
): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  const pos1 = a.getAttribute("position");
  const pos2 = b.getAttribute("position");

  const combined = new Float32Array(pos1.count * 3 + pos2.count * 3);
  combined.set(new Float32Array(pos1.array as ArrayLike<number>));
  combined.set(
    new Float32Array(pos2.array as ArrayLike<number>),
    pos1.count * 3,
  );
  merged.setAttribute("position", new THREE.BufferAttribute(combined, 3));

  const idx1 = a.getIndex();
  const idx2 = b.getIndex();
  if (idx1 && idx2) {
    const combinedIdx = new Uint32Array(idx1.count + idx2.count);
    combinedIdx.set(new Uint32Array(idx1.array as ArrayLike<number>));
    for (let i = 0; i < idx2.count; i++) {
      combinedIdx[idx1.count + i] =
        (idx2.array as Uint16Array | Uint32Array)[i] + pos1.count;
    }
    merged.setIndex(new THREE.BufferAttribute(combinedIdx, 1));
  }

  return merged;
}

function normalize(geo: THREE.BufferGeometry): void {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const center = new THREE.Vector3();
  bb.getCenter(center);
  const size = new THREE.Vector3();
  bb.getSize(size);
  const scale = 1.8 / Math.max(size.x, size.y, size.z);
  geo.translate(-center.x, -center.y, -center.z);
  geo.scale(scale, scale, scale);
}

function loadObj(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    new OBJLoader().load(url, resolve, undefined, reject);
  });
}

function loadGltf(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      reject,
    );
  });
}

/**
 * Load any supported 3D model and return a normalized, merged BufferGeometry.
 */
export async function loadModel(
  source: File | string,
): Promise<THREE.BufferGeometry> {
  const ext = getExtension(source);
  const { url, revoke } = getUrl(source);

  try {
    let group: THREE.Group;
    switch (ext) {
      case "obj":
        group = await loadObj(url);
        break;
      case "glb":
      case "gltf":
        group = await loadGltf(url);
        break;
      default:
        throw new Error(`Unsupported format: .${ext}`);
    }

    const merged = mergeGroup(group);
    if (!merged) throw new Error("No mesh geometry found in model");

    normalize(merged);
    merged.computeVertexNormals();
    return merged;
  } finally {
    revoke();
  }
}
