import * as THREE from "three";
import { createNoise3D } from "simplex-noise";

const NOISE_FREQ = 1.0;
const NOISE_OFFSETS = [0, 100, 200]; // R, G, B phase offsets
const COLOR_MIN = 0.25;
const COLOR_MAX = 0.55;
const MAX_SAMPLE_COUNT = 12000;
const CURVATURE_CULL_THRESHOLD = 0.45; // cubes above this curvature are removed entirely

/**
 * Builds normalized vertex-point geometry from a loaded OBJ.
 * Merges all child meshes, centers and scales to a unit sphere.
 * Uniformly samples points across the surface and assigns Perlin noise colors.
 */
export class BrainGeometryBuilder {
  readonly pointsGeo: THREE.BufferGeometry;
  readonly occlusionGeo: THREE.BufferGeometry;

  constructor(obj: THREE.Group) {
    const merged = this.mergeGeometries(obj);
    if (!merged) {
      this.pointsGeo = new THREE.BufferGeometry();
      this.occlusionGeo = new THREE.BufferGeometry();
      return;
    }

    this.normalizeGeometry(merged);
    merged.computeVertexNormals();
    this.occlusionGeo = merged.clone();
    const rawGeo = this.sampleSurface(merged, MAX_SAMPLE_COUNT);
    this.assignNoiseColors(rawGeo);
    this.assignCurvature(rawGeo);
    this.pointsGeo = this.filterByCurvature(rawGeo);
  }

  /**
   * Farthest Point Sampling with Lloyd relaxation.
   * 1. Oversample the surface randomly (area-weighted)
   * 2. Greedily select points by always picking the candidate farthest from all selected points
   * 3. Run Lloyd relaxation passes to even out spacing
   */
  private sampleSurface(
    geo: THREE.BufferGeometry,
    count: number,
  ): THREE.BufferGeometry {
    const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
    nonIndexed.computeVertexNormals();

    const posAttr = nonIndexed.getAttribute("position");
    const normAttr = nonIndexed.getAttribute("normal");
    const triCount = posAttr.count / 3;

    // --- Build triangle area CDF ---
    const areas = new Float32Array(triCount);
    const va = new THREE.Vector3();
    const vb = new THREE.Vector3();
    const vc = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    let totalArea = 0;

    for (let t = 0; t < triCount; t++) {
      const i = t * 3;
      va.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      vb.set(posAttr.getX(i + 1), posAttr.getY(i + 1), posAttr.getZ(i + 1));
      vc.set(posAttr.getX(i + 2), posAttr.getY(i + 2), posAttr.getZ(i + 2));
      ab.subVectors(vb, va);
      ac.subVectors(vc, va);
      areas[t] = ab.cross(ac).length() * 0.5;
      totalArea += areas[t];
    }

    const cdf = new Float32Array(triCount);
    cdf[0] = areas[0] / totalArea;
    for (let t = 1; t < triCount; t++) {
      cdf[t] = cdf[t - 1] + areas[t] / totalArea;
    }

    // --- Generate dense candidate pool ---
    const candidateCount = count * 3;
    // candidatePool: flat array [x,y,z, nx,ny,nz, ...] stride 6
    const pool = new Float32Array(candidateCount * 6);
    for (let s = 0; s < candidateCount; s++) {
      const r = Math.random();
      let lo = 0, hi = triCount - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
      const i = lo * 3;

      let u = Math.random(), v = Math.random();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const w = 1 - u - v;

      const off = s * 6;
      pool[off]     = posAttr.getX(i) * w + posAttr.getX(i + 1) * u + posAttr.getX(i + 2) * v;
      pool[off + 1] = posAttr.getY(i) * w + posAttr.getY(i + 1) * u + posAttr.getY(i + 2) * v;
      pool[off + 2] = posAttr.getZ(i) * w + posAttr.getZ(i + 1) * u + posAttr.getZ(i + 2) * v;
      pool[off + 3] = normAttr.getX(i) * w + normAttr.getX(i + 1) * u + normAttr.getX(i + 2) * v;
      pool[off + 4] = normAttr.getY(i) * w + normAttr.getY(i + 1) * u + normAttr.getY(i + 2) * v;
      pool[off + 5] = normAttr.getZ(i) * w + normAttr.getZ(i + 1) * u + normAttr.getZ(i + 2) * v;
    }

    // --- Farthest Point Sampling ---
    // For each candidate, track min distance to any selected point
    const minDist = new Float32Array(candidateCount).fill(Infinity);
    const selected = new Uint32Array(count);

    // Start with a random candidate
    selected[0] = Math.floor(Math.random() * candidateCount);

    for (let k = 1; k < count; k++) {
      // Update minDist with distance to last selected point
      const lastOff = selected[k - 1] * 6;
      const lx = pool[lastOff], ly = pool[lastOff + 1], lz = pool[lastOff + 2];

      let farthestIdx = 0;
      let farthestDist = 0;

      for (let c = 0; c < candidateCount; c++) {
        const cOff = c * 6;
        const dx = pool[cOff] - lx;
        const dy = pool[cOff + 1] - ly;
        const dz = pool[cOff + 2] - lz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < minDist[c]) minDist[c] = d;

        if (minDist[c] > farthestDist) {
          farthestDist = minDist[c];
          farthestIdx = c;
        }
      }

      selected[k] = farthestIdx;
    }

    // --- Lloyd relaxation (3 passes) ---
    // Move each selected point to the centroid of its nearby pool points
    const selPos = new Float32Array(count * 3);
    const selNorm = new Float32Array(count * 3);

    // Initialize from FPS results
    for (let k = 0; k < count; k++) {
      const off = selected[k] * 6;
      selPos[k * 3] = pool[off];
      selPos[k * 3 + 1] = pool[off + 1];
      selPos[k * 3 + 2] = pool[off + 2];
      selNorm[k * 3] = pool[off + 3];
      selNorm[k * 3 + 1] = pool[off + 4];
      selNorm[k * 3 + 2] = pool[off + 5];
    }

    for (let pass = 0; pass < 2; pass++) {
      // Assign each pool point to nearest selected point
      const centroidSum = new Float32Array(count * 6); // x,y,z,nx,ny,nz
      const centroidCount = new Uint32Array(count);

      for (let c = 0; c < candidateCount; c++) {
        const cOff = c * 6;
        const cx = pool[cOff], cy = pool[cOff + 1], cz = pool[cOff + 2];

        let bestK = 0, bestD = Infinity;
        for (let k = 0; k < count; k++) {
          const kOff = k * 3;
          const dx = selPos[kOff] - cx;
          const dy = selPos[kOff + 1] - cy;
          const dz = selPos[kOff + 2] - cz;
          const d = dx * dx + dy * dy + dz * dz;
          if (d < bestD) { bestD = d; bestK = k; }
        }

        const sOff = bestK * 6;
        centroidSum[sOff] += cx;
        centroidSum[sOff + 1] += cy;
        centroidSum[sOff + 2] += cz;
        centroidSum[sOff + 3] += pool[cOff + 3];
        centroidSum[sOff + 4] += pool[cOff + 4];
        centroidSum[sOff + 5] += pool[cOff + 5];
        centroidCount[bestK]++;
      }

      // Move selected points to centroids
      for (let k = 0; k < count; k++) {
        if (centroidCount[k] === 0) continue;
        const sOff = k * 6;
        const n = centroidCount[k];
        selPos[k * 3] = centroidSum[sOff] / n;
        selPos[k * 3 + 1] = centroidSum[sOff + 1] / n;
        selPos[k * 3 + 2] = centroidSum[sOff + 2] / n;
        selNorm[k * 3] = centroidSum[sOff + 3] / n;
        selNorm[k * 3 + 1] = centroidSum[sOff + 4] / n;
        selNorm[k * 3 + 2] = centroidSum[sOff + 5] / n;
      }

      // Snap back to nearest pool point (stays on surface)
      for (let k = 0; k < count; k++) {
        const kOff = k * 3;
        const kx = selPos[kOff], ky = selPos[kOff + 1], kz = selPos[kOff + 2];
        let bestC = 0, bestD = Infinity;
        for (let c = 0; c < candidateCount; c++) {
          const cOff = c * 6;
          const dx = pool[cOff] - kx;
          const dy = pool[cOff + 1] - ky;
          const dz = pool[cOff + 2] - kz;
          const d = dx * dx + dy * dy + dz * dz;
          if (d < bestD) { bestD = d; bestC = c; }
        }
        const cOff = bestC * 6;
        selPos[kOff] = pool[cOff];
        selPos[kOff + 1] = pool[cOff + 1];
        selPos[kOff + 2] = pool[cOff + 2];
        selNorm[kOff] = pool[cOff + 3];
        selNorm[kOff + 1] = pool[cOff + 4];
        selNorm[kOff + 2] = pool[cOff + 5];
      }
    }

    // Store the FPS selection order — first N points are always well-distributed
    const order = new Float32Array(count);
    for (let k = 0; k < count; k++) {
      order[k] = k;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(selPos, 3));
    pGeo.setAttribute("normal", new THREE.BufferAttribute(selNorm, 3));
    pGeo.setAttribute("order", new THREE.BufferAttribute(order, 1));
    return pGeo;
  }

  private assignNoiseColors(geo: THREE.BufferGeometry): void {
    const noise3D = createNoise3D();
    const posAttr = geo.getAttribute("position");
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);

      for (let c = 0; c < 3; c++) {
        const off = NOISE_OFFSETS[c];
        const raw = noise3D(
          x * NOISE_FREQ + off,
          y * NOISE_FREQ + off,
          z * NOISE_FREQ + off,
        );
        colors[i * 3 + c] = COLOR_MIN + ((raw + 1) / 2) * (COLOR_MAX - COLOR_MIN);
      }
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }

  /**
   * Estimates curvature per point by comparing each point's normal
   * to the normals of its K nearest neighbors.
   * High divergence = crease/fold, stored as 0..1.
   */
  private assignCurvature(geo: THREE.BufferGeometry): void {
    const posAttr = geo.getAttribute("position");
    const normAttr = geo.getAttribute("normal");
    const n = posAttr.count;
    const K = 8;

    // Build spatial grid for fast neighbor lookup
    const cellSize = 0.15;
    const grid = new Map<string, number[]>();
    const key = (x: number, y: number, z: number) =>
      `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;

    for (let i = 0; i < n; i++) {
      const k = key(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k)!.push(i);
    }

    const curvature = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const px = posAttr.getX(i), py = posAttr.getY(i), pz = posAttr.getZ(i);
      const nx = normAttr.getX(i), ny = normAttr.getY(i), nz = normAttr.getZ(i);

      // Gather neighbors from surrounding cells
      const cx = Math.floor(px / cellSize);
      const cy = Math.floor(py / cellSize);
      const cz = Math.floor(pz / cellSize);

      const neighbors: { dist: number; idx: number }[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const cell = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
            if (!cell) continue;
            for (const j of cell) {
              if (j === i) continue;
              const ddx = posAttr.getX(j) - px;
              const ddy = posAttr.getY(j) - py;
              const ddz = posAttr.getZ(j) - pz;
              neighbors.push({ dist: ddx * ddx + ddy * ddy + ddz * ddz, idx: j });
            }
          }
        }
      }

      // Sort by distance, take K nearest
      neighbors.sort((a, b) => a.dist - b.dist);
      const kNearest = neighbors.slice(0, K);

      if (kNearest.length === 0) {
        curvature[i] = 0;
        continue;
      }

      // Average angular deviation of neighbor normals from this normal
      let totalDev = 0;
      for (const nb of kNearest) {
        const nnx = normAttr.getX(nb.idx);
        const nny = normAttr.getY(nb.idx);
        const nnz = normAttr.getZ(nb.idx);
        // dot product (both should be unit-ish)
        const dot = nx * nnx + ny * nny + nz * nnz;
        // 1 - dot: 0 when parallel, 2 when opposite
        totalDev += 1 - Math.max(-1, Math.min(1, dot));
      }

      // Normalize: avg deviation in [0, 2], map to [0, 1]
      curvature[i] = Math.min(1, totalDev / kNearest.length);
    }

    geo.setAttribute("curvature", new THREE.BufferAttribute(curvature, 1));
  }

  /**
   * Removes points above the curvature threshold (deep creases)
   * and re-indexes remaining points preserving FPS order.
   */
  private filterByCurvature(geo: THREE.BufferGeometry): THREE.BufferGeometry {
    const posAttr = geo.getAttribute("position");
    const normAttr = geo.getAttribute("normal");
    const colorAttr = geo.getAttribute("color");
    const curvAttr = geo.getAttribute("curvature");
    const orderAttr = geo.getAttribute("order");
    const n = posAttr.count;

    // Collect indices of points that survive the cull
    const kept: number[] = [];
    for (let i = 0; i < n; i++) {
      if (curvAttr.getX(i) < CURVATURE_CULL_THRESHOLD) {
        kept.push(i);
      }
    }

    const kn = kept.length;
    const newPos = new Float32Array(kn * 3);
    const newNorm = new Float32Array(kn * 3);
    const newColor = new Float32Array(kn * 3);
    const newCurv = new Float32Array(kn);
    const newOrder = new Float32Array(kn);

    for (let j = 0; j < kn; j++) {
      const i = kept[j];
      newPos[j * 3] = posAttr.getX(i);
      newPos[j * 3 + 1] = posAttr.getY(i);
      newPos[j * 3 + 2] = posAttr.getZ(i);
      newNorm[j * 3] = normAttr.getX(i);
      newNorm[j * 3 + 1] = normAttr.getY(i);
      newNorm[j * 3 + 2] = normAttr.getZ(i);
      newColor[j * 3] = colorAttr.getX(i);
      newColor[j * 3 + 1] = colorAttr.getY(i);
      newColor[j * 3 + 2] = colorAttr.getZ(i);
      newCurv[j] = curvAttr.getX(i);
      newOrder[j] = j; // re-index order sequentially
    }

    const filtered = new THREE.BufferGeometry();
    filtered.setAttribute("position", new THREE.BufferAttribute(newPos, 3));
    filtered.setAttribute("normal", new THREE.BufferAttribute(newNorm, 3));
    filtered.setAttribute("color", new THREE.BufferAttribute(newColor, 3));
    filtered.setAttribute("curvature", new THREE.BufferAttribute(newCurv, 1));
    filtered.setAttribute("order", new THREE.BufferAttribute(newOrder, 1));
    return filtered;
  }

  private mergeGeometries(obj: THREE.Group): THREE.BufferGeometry | null {
    const geometries: THREE.BufferGeometry[] = [];

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geo = child.geometry.clone();
        geo.applyMatrix4(child.matrixWorld);
        geometries.push(geo);
      }
    });

    if (geometries.length === 0) return null;
    if (geometries.length === 1) return geometries[0];

    return this.mergeBufferGeometries(geometries);
  }

  private mergeBufferGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
    let result = geos[0];

    for (let i = 1; i < geos.length; i++) {
      result = this.mergeTwo(result, geos[i]);
    }
    return result;
  }

  private mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
    const merged = new THREE.BufferGeometry();
    const pos1 = a.getAttribute("position");
    const pos2 = b.getAttribute("position");

    const combined = new Float32Array(pos1.count * 3 + pos2.count * 3);
    combined.set(new Float32Array(pos1.array as ArrayLike<number>));
    combined.set(new Float32Array(pos2.array as ArrayLike<number>), pos1.count * 3);
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

  private normalizeGeometry(geo: THREE.BufferGeometry): void {
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
}
