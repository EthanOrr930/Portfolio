"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { assetUrl } from "@/lib/assets";
import type { SceneData } from "@/lib/animation/types";
import {
  interpolateCamera,
  interpolateTransform,
  resolveModelState,
  getMaxVh,
} from "@/lib/animation/interpolation";
import {
  CascadeParticles,
  type CascadeState,
  type DecodedKeyframe,
} from "./CascadeParticles";
import { ProjectsSection } from "./ProjectsSection";
import { CitySection } from "./CitySection";
import { RecorderSection } from "./RecorderSection";
import { HeroText } from "./HeroText";
import { BackgroundGradient } from "../particle-scene/BackgroundGradient";
import { PostProcessing } from "../particle-scene/PostProcessing";

// ── Projects tuning ────────────────────────────────────────────────
// Extra vh of scroll appended after the particle animation completes, used
// to drive the ProjectsSection slide-up AND dwell on each featured project.
// Budget = slide + (pause + dwell × project count). See ProjectsViewport for
// the per-project dwell constant (2.0 vh/project).
const PROJECTS_SLIDE_VH = 1.0;  // how long the panel takes to slide up
const PROJECTS_REST_VH = 3.3;   // 0.2 pause + 2.8 dwell for project 1 + 0.3 tail
// Project 2 — ruined-city cinematic. Kicks off the instant the Hydro cubes drop
// (= their hideVh: revealBase 7.5 + 0.2 pause + 2.8 dwell), so the time-based
// fly-in takes over the moment you see them fall — you can let go and watch.
const CITY_START_VH = 10.5;
// Shortened from 11: just fly-in + bolt + the copy slide-out. The old dead tail
// (bolt flying on to 70) is gone — the recorder takes over the instant the copy
// exits, so the city dissolves straight into Project 3.
const CITY_VH = 3.5;
// Project 3 — Session Recorder. Takes over where the city copy exits; interactive
// finale (turn on → record → laptop handoff), so its vh is just a dwell band.
const RECORDER_START_VH = CITY_START_VH + CITY_VH; // ≈ where the copy slides out
const RECORDER_VH = 3;

// ---------------------------------------------------------------------------
// EXR decoding (same as editor's useModelKeyframeLoader)
// ---------------------------------------------------------------------------

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
        let em = m; let exp = -14;
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

  const hasScale = scales.some((s) => s > 0);
  if (!hasScale) scales.fill(0.8);
  return { positions, scales, count: n };
}

async function loadAndDecodeEXR(path: string): Promise<DecodedKeyframe> {
  const loader = new EXRLoader();
  loader.setDataType(THREE.FloatType);
  const url = assetUrl(`/${path}`);
  return new Promise((resolve, reject) => {
    loader.load(url, (tex) => resolve(decodeEXR(tex as unknown as THREE.DataTexture)), undefined, reject);
  });
}

/**
 * Clone an existing decoded keyframe — used to make the "noise" keyframe
 * an exact copy of the previous keyframe (the brain) so the cascade
 * brain → noise transition is a visual no-op. The fall-off shader
 * handles all the visible motion in that scroll range instead.
 */
function cloneKeyframe(src: DecodedKeyframe): DecodedKeyframe {
  return {
    positions: new Float32Array(src.positions),
    scales: new Float32Array(src.scales),
    count: src.count,
  };
}

// ---------------------------------------------------------------------------
// Scene loader — loads scene.json + all EXRs
// ---------------------------------------------------------------------------

interface LoadedScene {
  scene: SceneData;
  decodedModels: Map<string, DecodedKeyframe>;
}

function useSceneLoader() {
  const [data, setData] = useState<LoadedScene | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const url = assetUrl("/pages/scene.json");
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to load scene.json: ${resp.status}`);
        const scene: SceneData = await resp.json();

        // Load real EXR keyframes in parallel.
        const decodedModels = new Map<string, DecodedKeyframe>();
        await Promise.all(
          scene.model.keyframes.map(async (kf, _idx) => {
            const isNoise = /noise/i.test(kf.exrPath);
            if (isNoise) return; // handled in second pass
            const decoded = await loadAndDecodeEXR(kf.exrPath);
            decodedModels.set(kf.id, decoded);
          }),
        );

        // Second pass: any "noise" keyframe becomes a clone of the closest
        // previously-loaded keyframe (the brain). The cascade brain → noise
        // transition is then a visual no-op — the falloff shader handles
        // all the motion in that scroll range with an upward impulse +
        // gravity per particle, so brain → fall is one continuous arc.
        for (let i = 0; i < scene.model.keyframes.length; i++) {
          const kf = scene.model.keyframes[i];
          if (!/noise/i.test(kf.exrPath)) continue;
          let prev: DecodedKeyframe | undefined;
          for (let j = i - 1; j >= 0; j--) {
            prev = decodedModels.get(scene.model.keyframes[j].id);
            if (prev) break;
          }
          if (prev) decodedModels.set(kf.id, cloneKeyframe(prev));
        }

        if (!cancelled) setData({ scene, decodedModels });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { data, error };
}

// ---------------------------------------------------------------------------
// Scroll → vh mapping
// ---------------------------------------------------------------------------

function useScrollVh(maxVh: number, extraVh: number) {
  const scrollVhRef = useRef(0);
  const [totalHeight, setTotalHeight] = useState(0);

  useEffect(() => {
    setTotalHeight(maxVh + 1.1 + extraVh);

    function onScroll() {
      scrollVhRef.current = window.scrollY / window.innerHeight;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [maxVh, extraVh]);

  return { scrollVhRef, totalHeight };
}

// ---------------------------------------------------------------------------
// Scene controller — exact same rendering as the editor
// ---------------------------------------------------------------------------

const EMPTY_DECODED: DecodedKeyframe = {
  positions: new Float32Array(0),
  scales: new Float32Array(0),
  count: 0,
};

function SceneController({
  scene,
  decodedModels,
  scrollVhRef,
  fallStartVh,
  fallEndVh,
}: {
  scene: SceneData;
  decodedModels: Map<string, DecodedKeyframe>;
  scrollVhRef: React.RefObject<number>;
  /** Scroll vh where the bottom-to-top fall wave begins (the moment the
   *  first model transition ends — i.e. the brain keyframe vh). */
  fallStartVh: number;
  /** Scroll vh where the fall wave fully completes. */
  fallEndVh: number;
}) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const cascadeRef = useRef<CascadeState>({
    keyframeA: EMPTY_DECODED,
    keyframeB: EMPTY_DECODED,
    transitionProgress: 0,
    cascadeSpread: 0.5,
    cascadeOrigin: "top-down",
    positionEasing: 0,
    depthFarA: 3.5,
    depthNearA: 1.8,
    depthFarB: 3.5,
    depthNearB: 1.8,
    falloffProgress: 0,
  });

  // Update every frame so camera/transform/cascade state stay in sync with
  // scroll momentum and the wormhole ripple, which also runs in useFrame.
  useFrame(() => {
    const scrollVh = scrollVhRef.current ?? 0;
    const cam = interpolateCamera(scene.camera.keyframes, scrollVh);
    camera.position.set(...cam.position);
    camera.rotation.set(...cam.rotation);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }

    // Transform
    if (groupRef.current) {
      const tf = interpolateTransform(scene.transform.keyframes, scrollVh);
      groupRef.current.position.set(...tf.position);
      groupRef.current.rotation.set(...tf.rotation);
      groupRef.current.scale.setScalar(tf.scale);
    }

    // Model
    const modelState = resolveModelState(
      scene.model.keyframes,
      scene.model.transitions,
      scrollVh,
    );

    const kfA = scene.model.keyframes[modelState.keyframeAIndex];
    const kfB = scene.model.keyframes[modelState.keyframeBIndex];
    const decodedA = (kfA && decodedModels.get(kfA.id)) ?? EMPTY_DECODED;
    const decodedB = (kfB && decodedModels.get(kfB.id)) ?? EMPTY_DECODED;

    // Falloff (the bottom-to-top wave) starts the moment the first model
    // transition ends (the brain keyframe vh) and runs until the finale
    // panel is fully visible. Reversible on scroll-up since it's pure
    // scroll math.
    const falloffProgress = Math.max(
      0,
      Math.min(1, (scrollVh - fallStartVh) / Math.max(1e-4, fallEndVh - fallStartVh)),
    );

    cascadeRef.current = {
      keyframeA: decodedA,
      keyframeB: decodedB,
      transitionProgress: modelState.transitionProgress,
      cascadeSpread: modelState.cascadeSpread,
      cascadeOrigin: modelState.cascadeOrigin,
      positionEasing: modelState.positionEasing,
      depthFarA: cam.depthFar,
      depthNearA: cam.depthNear,
      depthFarB: cam.depthFar,
      depthNearB: cam.depthNear,
      falloffProgress,
      fallCascadeOrigin:
        scene.model.transitions[scene.model.transitions.length - 1]
          ?.cascadeOrigin ?? "bottom-up",
    };
  });

  return (
    <group ref={groupRef}>
      <CascadeParticles cascadeState={cascadeRef} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Loading indicator
// ---------------------------------------------------------------------------

function LoadingIndicator() {
  return (
    <div className="fixed inset-0 bg-[#f5f0eb] flex items-center justify-center">
      <div className="w-4 h-4 bg-zinc-300 rounded-full animate-pulse" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ScrollExperience() {
  const { data, error } = useSceneLoader();

  const maxVh = data ? getMaxVh(data.scene) : 0;
  // Fall wave: starts when the first model transition ends (brain vh),
  // ends slightly past maxVh. Particles fully clear BEFORE the panel
  // starts sliding up — clean handoff, no overlap.
  const fallStartVh = data
    ? data.scene.model.keyframes[data.scene.model.keyframes.length - 2]?.vh ?? 0
    : 0;
  const fallEndVh = maxVh + 0.5;
  // Panel starts sliding up when the fall is ~85% complete.
  const projectsStartVh = 6.5;
  // Scroll height accounts for the fall extending past maxVh + panel + rest.
  const projectsExtraVh =
    (fallEndVh - maxVh) + PROJECTS_SLIDE_VH + PROJECTS_REST_VH + CITY_VH + RECORDER_VH;
  const { scrollVhRef, totalHeight } = useScrollVh(maxVh, projectsExtraVh);

  if (error) {
    console.error("Failed to load scene:", error);
    return <LoadingIndicator />;
  }

  if (!data) return <LoadingIndicator />;

  const { scene, decodedModels } = data;
  const initialCam = scene.camera.keyframes[0];

  return (
    <>
      {/* Scroll spacer */}
      <div style={{ height: `${totalHeight * 100}vh` }} />

      {/* Fixed viewport */}
      <div className="fixed inset-0">
        <Canvas
          camera={{
            position: initialCam?.position ?? [0, 0, 2.8],
            fov: initialCam?.fov ?? 50,
          }}
          // Cap at 1.5 (not 2): 9407 wireframe-transparent instances are
          // fill-rate bound, so retina 2× roughly doubled fragment cost for
          // little visible gain. 1.5 keeps it crisp and runs far cooler.
          dpr={[1, 1.5]}
          gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        >
          <BackgroundGradient />

          <Suspense fallback={null}>
            <SceneController
              scene={scene}
              decodedModels={decodedModels}
              scrollVhRef={scrollVhRef}
              fallStartVh={fallStartVh}
              fallEndVh={fallEndVh}
            />
          </Suspense>

          <PostProcessing />
        </Canvas>
      </div>

      {/* Hero text overlay — scroll-driven title + about block. Sits
          between the 3D canvas and the projects panel. */}
      <HeroText scrollVhRef={scrollVhRef} />

      {/* Projects panel — slides up over the particles at the end of scroll. */}
      <ProjectsSection
        scrollVhRef={scrollVhRef}
        startVh={projectsStartVh}
        slideDurationVh={PROJECTS_SLIDE_VH}
      />

      {/* Project 2 — ruined-city cinematic flying in after the Hydro Cube. */}
      <CitySection scrollVhRef={scrollVhRef} startVh={CITY_START_VH} />

      {/* Project 3 — Session Recorder. Spins in the instant the city copy exits
          (recorderSignal); interactive finale. mountVh/resetVh warm up + replay,
          fallbackVh force-arms on a fast fling. */}
      <RecorderSection
        scrollVhRef={scrollVhRef}
        mountVh={RECORDER_START_VH - 2.5}
        fallbackVh={RECORDER_START_VH + 1}
      />
    </>
  );
}
