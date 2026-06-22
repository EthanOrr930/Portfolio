import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import type {
  ProcessingParams,
  ProcessingResult,
  ProgressInfo,
} from "./types";

const NOISE_OFFSETS = [0, 100, 200];
const COLOR_MIN = 0.25;
const COLOR_MAX = 0.55;

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Process a BufferGeometry into evenly-distributed sample points
 * with colors, normals, curvature, and FPS ordering.
 *
 * Async with progress reporting so the UI stays responsive.
 */
export async function processGeometry(
  geo: THREE.BufferGeometry,
  params: ProcessingParams,
  onProgress?: (info: ProgressInfo) => void,
): Promise<ProcessingResult> {
  const report = (stage: string, progress: number) =>
    onProgress?.({ stage, progress });

  // ── 1. Sample surface ─────────────────────────────────────
  report("Preparing surface", 0);
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  nonIndexed.computeVertexNormals();

  const posAttr = nonIndexed.getAttribute("position");
  const normAttr = nonIndexed.getAttribute("normal");
  const triCount = posAttr.count / 3;

  // Build triangle area CDF
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

  // ── 2. Generate candidate pool ────────────────────────────
  report("Generating candidates", 0.05);
  const count = params.sampleCount;
  const candidateCount = count * params.candidateMultiplier;
  const pool = new Float32Array(candidateCount * 6);

  for (let s = 0; s < candidateCount; s++) {
    const r = Math.random();
    let lo = 0,
      hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    const i = lo * 3;

    let u = Math.random(),
      v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;

    const off = s * 6;
    pool[off] =
      posAttr.getX(i) * w + posAttr.getX(i + 1) * u + posAttr.getX(i + 2) * v;
    pool[off + 1] =
      posAttr.getY(i) * w + posAttr.getY(i + 1) * u + posAttr.getY(i + 2) * v;
    pool[off + 2] =
      posAttr.getZ(i) * w + posAttr.getZ(i + 1) * u + posAttr.getZ(i + 2) * v;
    pool[off + 3] =
      normAttr.getX(i) * w +
      normAttr.getX(i + 1) * u +
      normAttr.getX(i + 2) * v;
    pool[off + 4] =
      normAttr.getY(i) * w +
      normAttr.getY(i + 1) * u +
      normAttr.getY(i + 2) * v;
    pool[off + 5] =
      normAttr.getZ(i) * w +
      normAttr.getZ(i + 1) * u +
      normAttr.getZ(i + 2) * v;
  }

  await yieldToMain();

  // ── 3. Farthest Point Sampling ────────────────────────────
  report("Farthest point sampling", 0.1);
  const minDist = new Float32Array(candidateCount).fill(Infinity);
  const selected = new Uint32Array(count);
  selected[0] = Math.floor(Math.random() * candidateCount);

  for (let k = 1; k < count; k++) {
    const lastOff = selected[k - 1] * 6;
    const lx = pool[lastOff],
      ly = pool[lastOff + 1],
      lz = pool[lastOff + 2];

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

    if (k % 200 === 0) {
      report("Farthest point sampling", 0.1 + 0.5 * (k / count));
      await yieldToMain();
    }
  }

  // ── 4. Lloyd relaxation ───────────────────────────────────
  const selPos = new Float32Array(count * 3);
  const selNorm = new Float32Array(count * 3);

  for (let k = 0; k < count; k++) {
    const off = selected[k] * 6;
    selPos[k * 3] = pool[off];
    selPos[k * 3 + 1] = pool[off + 1];
    selPos[k * 3 + 2] = pool[off + 2];
    selNorm[k * 3] = pool[off + 3];
    selNorm[k * 3 + 1] = pool[off + 4];
    selNorm[k * 3 + 2] = pool[off + 5];
  }

  for (let pass = 0; pass < params.lloydPasses; pass++) {
    report(
      `Lloyd relaxation pass ${pass + 1}/${params.lloydPasses}`,
      0.6 + 0.15 * (pass / params.lloydPasses),
    );
    await yieldToMain();

    const centroidSum = new Float32Array(count * 6);
    const centroidCount = new Uint32Array(count);

    for (let c = 0; c < candidateCount; c++) {
      const cOff = c * 6;
      const cx = pool[cOff],
        cy = pool[cOff + 1],
        cz = pool[cOff + 2];

      let bestK = 0,
        bestD = Infinity;
      for (let k = 0; k < count; k++) {
        const kOff = k * 3;
        const dx = selPos[kOff] - cx;
        const dy = selPos[kOff + 1] - cy;
        const dz = selPos[kOff + 2] - cz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD) {
          bestD = d;
          bestK = k;
        }
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

    // Snap back to nearest pool point
    for (let k = 0; k < count; k++) {
      const kOff = k * 3;
      const kx = selPos[kOff],
        ky = selPos[kOff + 1],
        kz = selPos[kOff + 2];
      let bestC = 0,
        bestD = Infinity;
      for (let c = 0; c < candidateCount; c++) {
        const cOff = c * 6;
        const dx = pool[cOff] - kx;
        const dy = pool[cOff + 1] - ky;
        const dz = pool[cOff + 2] - kz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD) {
          bestD = d;
          bestC = c;
        }
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

  // ── 5. Assign noise colors ────────────────────────────────
  report("Assigning colors", 0.8);
  await yieldToMain();

  const noise3D = createNoise3D();
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = selPos[i * 3];
    const y = selPos[i * 3 + 1];
    const z = selPos[i * 3 + 2];
    for (let c = 0; c < 3; c++) {
      const off = NOISE_OFFSETS[c];
      const raw = noise3D(
        x * params.noiseFreq + off,
        y * params.noiseFreq + off,
        z * params.noiseFreq + off,
      );
      colors[i * 3 + c] = COLOR_MIN + ((raw + 1) / 2) * (COLOR_MAX - COLOR_MIN);
    }
  }

  // ── 6. Compute curvature ──────────────────────────────────
  report("Computing curvature", 0.85);
  await yieldToMain();

  const cellSize = params.curvatureGridCell;
  const grid = new Map<string, number[]>();
  const key = (x: number, y: number, z: number) =>
    `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;

  for (let i = 0; i < count; i++) {
    const k = key(selPos[i * 3], selPos[i * 3 + 1], selPos[i * 3 + 2]);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(i);
  }

  const curvature = new Float32Array(count);
  const K = params.curvatureK;

  for (let i = 0; i < count; i++) {
    const px = selPos[i * 3],
      py = selPos[i * 3 + 1],
      pz = selPos[i * 3 + 2];
    const nx = selNorm[i * 3],
      ny = selNorm[i * 3 + 1],
      nz = selNorm[i * 3 + 2];
    const cx = Math.floor(px / cellSize),
      cy = Math.floor(py / cellSize),
      cz = Math.floor(pz / cellSize);

    const neighbors: { dist: number; idx: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!cell) continue;
          for (const j of cell) {
            if (j === i) continue;
            const ddx = selPos[j * 3] - px;
            const ddy = selPos[j * 3 + 1] - py;
            const ddz = selPos[j * 3 + 2] - pz;
            neighbors.push({
              dist: ddx * ddx + ddy * ddy + ddz * ddz,
              idx: j,
            });
          }
        }
      }
    }

    neighbors.sort((a, b) => a.dist - b.dist);
    const kNearest = neighbors.slice(0, K);
    if (kNearest.length === 0) {
      curvature[i] = 0;
      continue;
    }

    let totalDev = 0;
    for (const nb of kNearest) {
      const dot =
        nx * selNorm[nb.idx * 3] +
        ny * selNorm[nb.idx * 3 + 1] +
        nz * selNorm[nb.idx * 3 + 2];
      totalDev += 1 - Math.max(-1, Math.min(1, dot));
    }
    curvature[i] = Math.min(1, totalDev / kNearest.length);
  }

  // ── 7. Filter by curvature ────────────────────────────────
  report("Filtering creases", 0.95);
  await yieldToMain();

  const threshold = params.curvatureThreshold;
  const kept: number[] = [];
  for (let i = 0; i < count; i++) {
    if (curvature[i] < threshold) kept.push(i);
  }

  const kn = kept.length;
  const outPos = new Float32Array(kn * 3);
  const outNorm = new Float32Array(kn * 3);
  const outColor = new Float32Array(kn * 3);
  const outCurv = new Float32Array(kn);
  const outOrder = new Float32Array(kn);

  for (let j = 0; j < kn; j++) {
    const i = kept[j];
    outPos[j * 3] = selPos[i * 3];
    outPos[j * 3 + 1] = selPos[i * 3 + 1];
    outPos[j * 3 + 2] = selPos[i * 3 + 2];
    outNorm[j * 3] = selNorm[i * 3];
    outNorm[j * 3 + 1] = selNorm[i * 3 + 1];
    outNorm[j * 3 + 2] = selNorm[i * 3 + 2];
    outColor[j * 3] = colors[i * 3];
    outColor[j * 3 + 1] = colors[i * 3 + 1];
    outColor[j * 3 + 2] = colors[i * 3 + 2];
    outCurv[j] = curvature[i];
    outOrder[j] = j;
  }

  // ── 8. Compute density → bake as base scale ────────────────
  report("Computing density", 0.97);
  await yieldToMain();

  const DENSITY_RADIUS = 0.06;
  const DENSITY_R2 = DENSITY_RADIUS * DENSITY_RADIUS;
  const dCellSize = DENSITY_RADIUS;
  const dGrid = new Map<string, number[]>();
  const dKey = (x: number, y: number, z: number) =>
    `${Math.floor(x / dCellSize)},${Math.floor(y / dCellSize)},${Math.floor(z / dCellSize)}`;

  for (let i = 0; i < kn; i++) {
    const k = dKey(outPos[i * 3], outPos[i * 3 + 1], outPos[i * 3 + 2]);
    if (!dGrid.has(k)) dGrid.set(k, []);
    dGrid.get(k)!.push(i);
  }

  const density = new Float32Array(kn);
  for (let i = 0; i < kn; i++) {
    const px = outPos[i * 3], py = outPos[i * 3 + 1], pz = outPos[i * 3 + 2];
    const cx2 = Math.floor(px / dCellSize), cy2 = Math.floor(py / dCellSize), cz2 = Math.floor(pz / dCellSize);
    let cnt = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = dGrid.get(`${cx2 + dx},${cy2 + dy},${cz2 + dz}`);
          if (!cell) continue;
          for (const j of cell) {
            if (j === i) continue;
            const ddx = outPos[j * 3] - px;
            const ddy = outPos[j * 3 + 1] - py;
            const ddz = outPos[j * 3 + 2] - pz;
            if (ddx * ddx + ddy * ddy + ddz * ddz < DENSITY_R2) cnt++;
          }
        }
      }
    }
    density[i] = cnt;
  }

  // Normalize via median
  const dSorted = Array.from(density).sort((a, b) => a - b);
  const dMedian = dSorted[Math.floor(kn * 0.5)];
  const dScale = dMedian > 0 ? 0.5 / dMedian : 1;

  // Convert density to base scale (same math as the shader had)
  const outScales = new Float32Array(kn);
  for (let i = 0; i < kn; i++) {
    const d = Math.min(1, density[i] * dScale);
    // mix(0.15, 1.0, pow(d, 0.8)) * 0.8 base scale
    outScales[i] = (0.15 + 0.85 * Math.pow(d, 0.8)) * 0.8;
  }

  report("Done", 1);

  return {
    positions: outPos,
    normals: outNorm,
    colors: outColor,
    curvatures: outCurv,
    scales: outScales,
    order: outOrder,
    count: kn,
  };
}
