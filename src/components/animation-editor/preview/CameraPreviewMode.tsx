"use client";

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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

interface CameraPreviewModeProps {
  editor: AnimationEditorState;
}

const EMPTY_DECODED: DecodedKeyframe = {
  positions: new Float32Array(0),
  scales: new Float32Array(0),
  count: 0,
};

export function CameraPreviewMode({ editor }: CameraPreviewModeProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const decodedMap = useModelKeyframeLoader(editor.sceneData.model.keyframes);

  const selectedKf = editor.getSelectedCameraKeyframe();

  // When a camera keyframe is selected, snap camera to that position
  useEffect(() => {
    if (selectedKf) {
      camera.position.set(...selectedKf.position);
      camera.rotation.set(...selectedKf.rotation);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = selectedKf.fov;
        camera.updateProjectionMatrix();
      }
      if (controlsRef.current) {
        const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
        controlsRef.current.target
          .copy(camera.position)
          .add(dir.multiplyScalar(2));
        controlsRef.current.update();
      }
    }
  }, [selectedKf, camera]);

  // Cascade state for particle rendering
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

  // Update particles and transform each frame
  useFrame(() => {
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

    // Apply transform to particle group
    if (groupRef.current) {
      const tf = interpolateTransform(
        sceneData.transform.keyframes,
        currentVh,
      );
      groupRef.current.position.set(...tf.position);
      groupRef.current.rotation.set(...tf.rotation);
      groupRef.current.scale.setScalar(tf.scale);
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.1}
        zoomSpeed={0.5}
        minDistance={0.05}
        panSpeed={1}
      />
      <gridHelper args={[10, 10, "#333333", "#222222"]} />
      <axesHelper args={[0.5]} />

      {/* Render model particles for reference */}
      <group ref={groupRef}>
        <CascadeParticles cascadeState={cascadeRef} />
      </group>
    </>
  );
}
