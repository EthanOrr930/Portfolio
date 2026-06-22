"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CascadeParticles, type CascadeState, type DecodedKeyframe } from "./CascadeParticles";
import { BackgroundGradient } from "../particle-scene/BackgroundGradient";
import { PostProcessing } from "../particle-scene/PostProcessing";
import type { KeyframeData } from "@/lib/pages/types";
import {
  interpolateCamera,
  interpolateTransform,
  resolveModelState,
  POSITION_EASING_MAP,
} from "@/lib/animation/interpolation";
import { computeConstructionOvershoot } from "./modelOvershoot";
import type {
  CameraKeyframe,
  TransformKeyframe,
  ModelKeyframe,
  ModelTransition,
} from "@/lib/animation/types";

// ---------------------------------------------------------------------------
// Convert old PageData keyframes into the new per-track format so the shared
// interpolation module can be used for both the editor and production site.
// ---------------------------------------------------------------------------

function pageDataToCameraKeyframes(keyframes: KeyframeData[]): CameraKeyframe[] {
  let cursor = 0;
  return keyframes.map((kf, i) => {
    if (i > 0) cursor += kf.transition.scrollDuration;
    return {
      id: kf.id,
      vh: cursor,
      position: kf.particles.camera.position,
      rotation: kf.particles.camera.rotation ?? [0, 0, 0],
      fov: kf.particles.camera.fov,
      depthNear: kf.particles.depthNear ?? 1.8,
      depthFar: kf.particles.depthFar ?? 3.5,
      easing: { preset: "smooth" as const },
    };
  });
}

function pageDataToTransformKeyframes(keyframes: KeyframeData[]): TransformKeyframe[] {
  let cursor = 0;
  return keyframes.map((kf, i) => {
    if (i > 0) cursor += kf.transition.scrollDuration;
    return {
      id: kf.id + "_tf",
      vh: cursor,
      position: kf.particles.transform.position ?? [0, 0, 0],
      rotation: kf.particles.transform.rotation ?? [0, 0, 0],
      scale: kf.particles.transform.scale ?? 1,
      easing: { preset: "smooth" as const },
    };
  });
}

function pageDataToModelKeyframes(keyframes: KeyframeData[]): ModelKeyframe[] {
  let cursor = 0;
  return keyframes.map((kf, i) => {
    if (i > 0) cursor += kf.transition.scrollDuration;
    return {
      id: kf.id + "_mdl",
      vh: cursor,
      label: kf.label,
      exrPath: kf.particles.exrPath,
      positionCount: kf.particles.positionCount,
    };
  });
}

function pageDataToModelTransitions(keyframes: KeyframeData[]): ModelTransition[] {
  const transitions: ModelTransition[] = [];
  let cursor = 0;
  for (let i = 1; i < keyframes.length; i++) {
    cursor += keyframes[i].transition.scrollDuration;
    transitions.push({
      id: keyframes[i].id + "_trans",
      fromKeyframeId: keyframes[i - 1].id + "_mdl",
      toKeyframeId: keyframes[i].id + "_mdl",
      cascadeOrigin: keyframes[i].transition.cascadeOrigin,
      cascadeSpread: keyframes[i].transition.cascadeSpread,
      positionEasing: keyframes[i].transition.positionEasing ?? "smoothstep",
      startOffset: 0,
      endOffset: 0,
    });
  }
  return transitions;
}

// ---------------------------------------------------------------------------
// Scene controller — applies interpolated state each frame
// ---------------------------------------------------------------------------

interface SceneControllerProps {
  cameraKeyframes: CameraKeyframe[];
  transformKeyframes: TransformKeyframe[];
  modelKeyframes: ModelKeyframe[];
  modelTransitions: ModelTransition[];
  decodedKeyframes: DecodedKeyframe[];
  scrollVh: number;
  cascadeRef: React.RefObject<CascadeState>;
}

const EMPTY_DECODED: DecodedKeyframe = {
  positions: new Float32Array(0),
  scales: new Float32Array(0),
  count: 0,
};

function SceneController({
  cameraKeyframes,
  transformKeyframes,
  modelKeyframes,
  modelTransitions,
  decodedKeyframes,
  scrollVh,
  cascadeRef,
}: SceneControllerProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // Build decoded lookup by model keyframe ID
  const decodedById = useRef(new Map<string, DecodedKeyframe>());
  useEffect(() => {
    const map = new Map<string, DecodedKeyframe>();
    for (let i = 0; i < modelKeyframes.length; i++) {
      if (decodedKeyframes[i]) {
        map.set(modelKeyframes[i].id, decodedKeyframes[i]);
      }
    }
    decodedById.current = map;
  }, [modelKeyframes, decodedKeyframes]);

  useEffect(() => {
    // Apply camera
    const cam = interpolateCamera(cameraKeyframes, scrollVh);
    camera.position.set(...cam.position);
    camera.rotation.set(...cam.rotation);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }

    // Apply transform + a post-construction overshoot: the formed model
    // carries momentum slightly past its pose, then settles over a few vh.
    if (groupRef.current) {
      const tf = interpolateTransform(transformKeyframes, scrollVh);
      const o = computeConstructionOvershoot(
        transformKeyframes,
        modelKeyframes,
        modelTransitions,
        scrollVh,
      );
      groupRef.current.position.set(
        tf.position[0] + o.position[0],
        tf.position[1] + o.position[1],
        tf.position[2] + o.position[2],
      );
      groupRef.current.rotation.set(
        tf.rotation[0] + o.rotation[0],
        tf.rotation[1] + o.rotation[1],
        tf.rotation[2] + o.rotation[2],
      );
      groupRef.current.scale.setScalar(tf.scale);
    }

    // Resolve model state
    const modelState = resolveModelState(
      modelKeyframes,
      modelTransitions,
      scrollVh,
    );

    const kfA = modelKeyframes[modelState.keyframeAIndex];
    const kfB = modelKeyframes[modelState.keyframeBIndex];
    const decodedA = (kfA && decodedById.current.get(kfA.id)) ?? EMPTY_DECODED;
    const decodedB = (kfB && decodedById.current.get(kfB.id)) ?? EMPTY_DECODED;
    const camState = interpolateCamera(cameraKeyframes, scrollVh);

    cascadeRef.current = {
      keyframeA: decodedA,
      keyframeB: decodedB,
      transitionProgress: modelState.transitionProgress,
      cascadeSpread: modelState.cascadeSpread,
      cascadeOrigin: modelState.cascadeOrigin,
      positionEasing: modelState.positionEasing,
      depthFarA: camState.depthFar,
      depthNearA: camState.depthNear,
      depthFarB: camState.depthFar,
      depthNearB: camState.depthNear,
    };
  }, [
    camera,
    cameraKeyframes,
    transformKeyframes,
    modelKeyframes,
    modelTransitions,
    scrollVh,
    cascadeRef,
  ]);

  return <group ref={groupRef}><CascadeParticles cascadeState={cascadeRef} /></group>;
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface ScrollCanvasProps {
  keyframes: KeyframeData[];
  decodedKeyframes: DecodedKeyframe[];
  activeIndex: number;
  transitionProgress: number;
  debugNoDepthScale?: boolean;
}

export function ScrollCanvas({
  keyframes,
  decodedKeyframes,
  activeIndex,
  transitionProgress,
}: ScrollCanvasProps) {
  // Convert PageData keyframes to per-track format once
  const cameraKeyframes = useRef(pageDataToCameraKeyframes(keyframes));
  const transformKeyframes = useRef(pageDataToTransformKeyframes(keyframes));
  const modelKeyframes = useRef(pageDataToModelKeyframes(keyframes));
  const modelTransitions = useRef(pageDataToModelTransitions(keyframes));

  // Compute the current scroll vh from activeIndex + transitionProgress
  // This reconstructs the absolute vh from the segment-based system
  const scrollVh = useRef(0);
  useEffect(() => {
    let cursor = 0;
    for (let i = 1; i <= activeIndex; i++) {
      cursor += keyframes[i].transition.scrollDuration;
    }
    if (activeIndex < keyframes.length - 1) {
      cursor += transitionProgress * keyframes[activeIndex + 1].transition.scrollDuration;
    }
    scrollVh.current = cursor;
  }, [keyframes, activeIndex, transitionProgress]);

  const cascadeRef = useRef<CascadeState>({
    keyframeA: decodedKeyframes[0] ?? EMPTY_DECODED,
    keyframeB: decodedKeyframes[Math.min(1, decodedKeyframes.length - 1)] ?? EMPTY_DECODED,
    transitionProgress: 0,
    cascadeSpread: 0.5,
    cascadeOrigin: "top-down",
    positionEasing: 0,
    depthFarA: 3.5,
    depthNearA: 1.8,
    depthFarB: 3.5,
    depthNearB: 1.8,
  });

  const initialCamera = keyframes[0]?.particles.camera;

  return (
    <Canvas
      camera={{
        position: initialCamera ? initialCamera.position : [0, 0, 2.8],
        fov: initialCamera?.fov ?? 50,
      }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
    >
      <BackgroundGradient />

      <Suspense fallback={null}>
        <SceneControllerWrapper
          cameraKeyframes={cameraKeyframes.current}
          transformKeyframes={transformKeyframes.current}
          modelKeyframes={modelKeyframes.current}
          modelTransitions={modelTransitions.current}
          decodedKeyframes={decodedKeyframes}
          keyframes={keyframes}
          activeIndex={activeIndex}
          transitionProgress={transitionProgress}
          cascadeRef={cascadeRef}
        />
      </Suspense>

      <PostProcessing />
    </Canvas>
  );
}

/**
 * Wrapper that computes scrollVh inside the R3F tree and passes it to SceneController.
 * We use useFrame here so updates happen every render frame.
 */
function SceneControllerWrapper({
  cameraKeyframes,
  transformKeyframes,
  modelKeyframes,
  modelTransitions,
  decodedKeyframes,
  keyframes,
  activeIndex,
  transitionProgress,
  cascadeRef,
}: {
  cameraKeyframes: CameraKeyframe[];
  transformKeyframes: TransformKeyframe[];
  modelKeyframes: ModelKeyframe[];
  modelTransitions: ModelTransition[];
  decodedKeyframes: DecodedKeyframe[];
  keyframes: KeyframeData[];
  activeIndex: number;
  transitionProgress: number;
  cascadeRef: React.RefObject<CascadeState>;
}) {
  // Compute absolute vh from the segment-based scroll system
  let cursor = 0;
  for (let i = 1; i <= activeIndex && i < keyframes.length; i++) {
    cursor += keyframes[i].transition.scrollDuration;
  }
  if (activeIndex < keyframes.length - 1) {
    cursor += transitionProgress * keyframes[activeIndex + 1].transition.scrollDuration;
  }

  return (
    <SceneController
      cameraKeyframes={cameraKeyframes}
      transformKeyframes={transformKeyframes}
      modelKeyframes={modelKeyframes}
      modelTransitions={modelTransitions}
      decodedKeyframes={decodedKeyframes}
      scrollVh={cursor}
      cascadeRef={cascadeRef}
    />
  );
}
