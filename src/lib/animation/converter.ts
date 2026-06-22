/**
 * Converts SceneData (v2) to PageData (v1) so the existing
 * ScrollExperience production system can consume editor output.
 */
import type { PageData, KeyframeData, EasingType } from "@/lib/pages/types";
import type { SceneData } from "./types";
import { interpolateCamera, interpolateTransform } from "./interpolation";

/**
 * Flatten the three independent tracks into the old KeyframeData[] format.
 *
 * Strategy: Use model keyframes as the "master" list since they define
 * which particle shapes are shown. For each model keyframe, sample
 * the camera and transform tracks at that vh position.
 */
export function sceneDataToPageData(scene: SceneData): PageData {
  const keyframes: KeyframeData[] = scene.model.keyframes.map((mkf, i) => {
    const cam = interpolateCamera(scene.camera.keyframes, mkf.vh);
    const tf = interpolateTransform(scene.transform.keyframes, mkf.vh);

    // Find transition TO this keyframe (from previous)
    const prevMkf = scene.model.keyframes[i - 1];
    const transition = prevMkf
      ? scene.model.transitions.find(
          (t) =>
            t.fromKeyframeId === prevMkf.id && t.toKeyframeId === mkf.id,
        )
      : undefined;

    // Compute scrollDuration from vh difference
    const prevVh = prevMkf?.vh ?? 0;
    const scrollDuration = i > 0 ? mkf.vh - prevVh : 1.5;

    return {
      id: mkf.id,
      label: mkf.label,
      particles: {
        exrPath: mkf.exrPath,
        positionCount: mkf.positionCount,
        camera: {
          position: cam.position,
          rotation: cam.rotation,
          fov: cam.fov,
        },
        transform: {
          position: tf.position,
          rotation: tf.rotation,
          scale: tf.scale,
        },
        depthFar: cam.depthFar,
        depthNear: cam.depthNear,
      },
      elements: [],
      transition: {
        scrollDuration: Math.max(0.5, scrollDuration),
        cascadeOrigin: transition?.cascadeOrigin ?? "top-down",
        easing: "ease-in-out" as EasingType,
        cascadeSpread: transition?.cascadeSpread ?? 0.5,
        positionEasing: transition?.positionEasing ?? "smoothstep",
      },
    };
  });

  return {
    version: 1,
    settings: scene.settings,
    keyframes,
  };
}
