import { useState, useEffect } from "react";
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { assetUrl } from "@/lib/assets";
import type { PageData } from "@/lib/pages/types";
import type { DecodedKeyframe } from "./CascadeParticles";

export interface LoadedKeyframes {
  pageData: PageData;
  keyframes: DecodedKeyframe[];
}

/**
 * Decode EXR texture data into positions + scales arrays.
 * Handles both Float32Array and Uint16Array (half-float) from EXRLoader.
 */
function decodeEXR(exrData: THREE.DataTexture): DecodedKeyframe {
  const exr = exrData as unknown as {
    image: { data: Float32Array | Uint16Array; width: number; height: number };
  };
  const rawData = exr.image.data;
  const n = Math.floor(rawData.length / 4);

  const isHalfFloat = rawData instanceof Uint16Array;

  const positions = new Float32Array(n * 3);
  const scales = new Float32Array(n);

  if (isHalfFloat) {
    const buf = new ArrayBuffer(4);
    const f32 = new Float32Array(buf);
    const u32 = new Uint32Array(buf);
    const decodeHalf = (h: number) => {
      const s = (h & 0x8000) << 16;
      const e = (h >> 10) & 0x1f;
      const m = h & 0x3ff;
      if (e === 0) {
        if (m === 0) { u32[0] = s; return f32[0]; }
        let em = m;
        let exp = -14;
        while ((em & 0x400) === 0) { em <<= 1; exp--; }
        em &= 0x3ff;
        u32[0] = s | ((exp + 127) << 23) | (em << 13);
        return f32[0];
      }
      if (e === 31) { u32[0] = s | 0x7f800000 | (m << 13); return f32[0]; }
      u32[0] = s | ((e - 15 + 127) << 23) | (m << 13);
      return f32[0];
    };
    for (let i = 0; i < n; i++) {
      const off = i * 4;
      positions[i * 3] = decodeHalf(rawData[off]);
      positions[i * 3 + 1] = decodeHalf(rawData[off + 1]);
      positions[i * 3 + 2] = decodeHalf(rawData[off + 2]);
      scales[i] = decodeHalf(rawData[off + 3]);
    }
  } else {
    for (let i = 0; i < n; i++) {
      const off = i * 4;
      positions[i * 3] = rawData[off];
      positions[i * 3 + 1] = rawData[off + 1];
      positions[i * 3 + 2] = rawData[off + 2];
      scales[i] = rawData[off + 3];
    }
  }

  // Default scale if all zeros (old format)
  const hasScale = scales.some((s) => s > 0);
  if (!hasScale) scales.fill(0.8);

  return { positions, scales, count: n };
}

async function loadAndDecodeEXR(path: string): Promise<DecodedKeyframe> {
  const loader = new EXRLoader();
  loader.setDataType(THREE.FloatType);
  const url = assetUrl(`/${path}`);
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => resolve(decodeEXR(tex as unknown as THREE.DataTexture)),
      undefined,
      reject,
    );
  });
}

export function useKeyframeLoader(jsonPath: string) {
  const [result, setResult] = useState<LoadedKeyframes | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const url = assetUrl(jsonPath);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to load ${jsonPath}: ${resp.status}`);
        const pageData: PageData = await resp.json();

        const keyframes = await Promise.all(
          pageData.keyframes.map((kf) => loadAndDecodeEXR(kf.particles.exrPath)),
        );

        if (!cancelled) {
          setResult({ pageData, keyframes });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [jsonPath]);

  return { data: result, error };
}
