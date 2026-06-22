"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { AnimationEditorState } from "../state/useAnimationEditor";
import {
  CascadeParticles,
  type CascadeState,
  type DecodedKeyframe,
} from "@/components/scroll-experience/CascadeParticles";
import {
  resolveModelState,
  interpolateCamera,
  interpolateTransform,
} from "@/lib/animation/interpolation";
import { useModelKeyframeLoader } from "./useModelKeyframeLoader";
import type { ProcessedPreview } from "../inspector/ModelInspector";

interface ModelPreviewModeProps {
  editor: AnimationEditorState;
  composedMode?: boolean;
  /** When set, shows a spinning preview of just-processed points */
  processedPreview?: ProcessedPreview | null;
}

const EMPTY_DECODED: DecodedKeyframe = {
  positions: new Float32Array(0),
  scales: new Float32Array(0),
  count: 0,
};

export function ModelPreviewMode({
  editor,
  composedMode = false,
  processedPreview,
}: ModelPreviewModeProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);
  const decodedMap = useModelKeyframeLoader(editor.sceneData.model.keyframes);

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
  });

  // Build a DecodedKeyframe from the processed preview
  const previewDecoded = useMemo<DecodedKeyframe | null>(() => {
    if (!processedPreview) return null;
    // Build positions (xyz interleaved) and scales for CascadeParticles
    return {
      positions: processedPreview.positions,
      scales: processedPreview.scales,
      count: processedPreview.count,
    };
  }, [processedPreview]);

  // Update cascade state each frame
  useFrame((_, delta) => {
    // Spinning preview mode — show just-processed model rotating
    if (previewDecoded && spinGroupRef.current) {
      spinGroupRef.current.rotation.y += delta * 0.5;

      cascadeRef.current = {
        keyframeA: previewDecoded,
        keyframeB: previewDecoded,
        transitionProgress: 0,
        cascadeSpread: 0.5,
        cascadeOrigin: "top-down",
        positionEasing: 0,
        depthFarA: 10,
        depthNearA: 0,
        depthFarB: 10,
        depthNearB: 0,
      };
      return;
    }

    // Normal mode — keyframe-driven
    const { sceneData, currentVh } = editor;
    const modelKfs = sceneData.model.keyframes;

    if (modelKfs.length === 0 || decodedMap.size === 0) return;

    const modelState = resolveModelState(
      modelKfs,
      sceneData.model.transitions,
      currentVh,
    );

    const kfA = modelKfs[modelState.keyframeAIndex];
    const kfB = modelKfs[modelState.keyframeBIndex];
    const decodedA = (kfA && decodedMap.get(kfA.id)) ?? EMPTY_DECODED;
    const decodedB = (kfB && decodedMap.get(kfB.id)) ?? EMPTY_DECODED;
    const cam = interpolateCamera(sceneData.camera.keyframes, currentVh);

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
    };

    if (composedMode) {
      camera.position.set(...cam.position);
      camera.rotation.set(...cam.rotation);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = cam.fov;
        camera.updateProjectionMatrix();
      }
      if (groupRef.current) {
        const tf = interpolateTransform(
          sceneData.transform.keyframes,
          currentVh,
        );
        groupRef.current.position.set(...tf.position);
        groupRef.current.rotation.set(...tf.rotation);
        groupRef.current.scale.setScalar(tf.scale);
      }
    }
  });

  return (
    <>
      {!composedMode && (
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} zoomSpeed={0.5} minDistance={0.05} panSpeed={1} />
      )}
      <gridHelper args={[10, 10, "#333333", "#222222"]} />
      <axesHelper args={[0.5]} />

      <group ref={previewDecoded ? spinGroupRef : groupRef}>
        <CascadeParticles cascadeState={cascadeRef} />
      </group>
    </>
  );
}
