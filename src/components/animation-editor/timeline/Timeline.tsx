"use client";

import { useCallback, useMemo } from "react";
import type { AnimationEditorState } from "../state/useAnimationEditor";
import type { EditorTab } from "@/lib/animation/types";
import { PlaybackControls } from "./PlaybackControls";
import { TimelineTrack } from "./TimelineTrack";
import {
  createCameraKeyframe,
  createTransformKeyframe,
  createModelKeyframe,
  createModelTransition,
} from "@/lib/animation/defaults";
import type { CameraCaptureData } from "../preview/useCameraCapture";
import type { TransformCaptureData } from "../preview/useTransformCapture";

interface TimelineProps {
  editor: AnimationEditorState;
  captureCamera: () => CameraCaptureData;
  captureTransform: () => TransformCaptureData;
  playback: {
    isPlaying: boolean;
    skipToStart: () => void;
    skipToEnd: () => void;
  };
  onTogglePlay: () => void;
}

const TABS: { key: EditorTab; label: string; color: string }[] = [
  { key: "camera", label: "Camera", color: "#f59e0b" },
  { key: "transform", label: "Transform", color: "#3b82f6" },
  { key: "model", label: "Model", color: "#10b981" },
];

export function Timeline({
  editor,
  captureCamera,
  captureTransform,
  playback,
  onTogglePlay,
}: TimelineProps) {
  const handleAddKeyframe = useCallback(() => {
    const vh = editor.currentVh;
    if (editor.activeTab === "camera") {
      const cam = captureCamera();
      const kf = createCameraKeyframe({
        vh,
        position: cam.position,
        rotation: cam.rotation,
        fov: cam.fov,
      });
      editor.addCameraKeyframe(kf);
      editor.setSelection({ type: "camera-keyframe", id: kf.id });
    } else if (editor.activeTab === "transform") {
      const tf = captureTransform();
      const kf = createTransformKeyframe({
        vh,
        position: tf.position,
        rotation: tf.rotation,
        scale: tf.scale,
      });
      editor.addTransformKeyframe(kf);
      editor.setSelection({ type: "transform-keyframe", id: kf.id });
    } else {
      const kf = createModelKeyframe({ vh });
      editor.addModelKeyframe(kf);
      editor.setSelection({ type: "model-keyframe", id: kf.id });
    }
  }, [editor, captureCamera, captureTransform]);

  // Shift-click transition creation logic
  const shiftPair = editor.shiftSelectedIds;
  const canAddTransition = useMemo(() => {
    if (shiftPair.length !== 2 || editor.activeTab !== "model") return null;

    const kfA = editor.sceneData.model.keyframes.find(
      (k) => k.id === shiftPair[0],
    );
    const kfB = editor.sceneData.model.keyframes.find(
      (k) => k.id === shiftPair[1],
    );
    if (!kfA || !kfB) return null;

    const minVh = Math.min(kfA.vh, kfB.vh);
    const maxVh = Math.max(kfA.vh, kfB.vh);

    // Check for overlap with existing transitions
    for (const t of editor.sceneData.model.transitions) {
      const fromKf = editor.sceneData.model.keyframes.find(
        (k) => k.id === t.fromKeyframeId,
      );
      const toKf = editor.sceneData.model.keyframes.find(
        (k) => k.id === t.toKeyframeId,
      );
      if (!fromKf || !toKf) continue;

      const tMin = Math.min(fromKf.vh, toKf.vh);
      const tMax = Math.max(fromKf.vh, toKf.vh);

      // Ranges overlap if one starts before the other ends
      if (minVh < tMax && maxVh > tMin) {
        return "overlap";
      }
    }

    return "ok";
  }, [shiftPair, editor.activeTab, editor.sceneData.model]);

  const handleAddTransition = useCallback(() => {
    if (canAddTransition !== "ok" || shiftPair.length !== 2) return;

    const kfA = editor.sceneData.model.keyframes.find(
      (k) => k.id === shiftPair[0],
    );
    const kfB = editor.sceneData.model.keyframes.find(
      (k) => k.id === shiftPair[1],
    );
    if (!kfA || !kfB) return;

    // Order by vh: from = earlier, to = later
    const [fromId, toId] =
      kfA.vh <= kfB.vh
        ? [kfA.id, kfB.id]
        : [kfB.id, kfA.id];

    const t = createModelTransition(fromId, toId);
    editor.addModelTransition(t);
    editor.setSelection({ type: "model-transition", id: t.id });
    editor.clearShiftSelect();
  }, [canAddTransition, shiftPair, editor]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header: Playback + vh + buttons */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 flex-shrink-0">
        <PlaybackControls
          isPlaying={playback.isPlaying}
          currentVh={editor.currentVh}
          onTogglePlay={onTogglePlay}
          onSkipToStart={playback.skipToStart}
          onSkipToEnd={playback.skipToEnd}
        />

        <div className="flex-1" />

        {/* Shift-click transition creation */}
        {canAddTransition === "ok" && (
          <button
            onClick={handleAddTransition}
            className="px-3 py-1 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
          >
            Add Transition
          </button>
        )}
        {canAddTransition === "overlap" && (
          <span className="text-[11px] text-red-400">
            Cannot overlap transitions
          </span>
        )}

        {/* Shift-click hint */}
        {editor.activeTab === "model" &&
          shiftPair.length > 0 &&
          shiftPair.length < 2 && (
            <span className="text-[11px] text-zinc-400">
              Shift-click another keyframe...
            </span>
          )}

        {/* Add keyframe */}
        <button
          onClick={handleAddKeyframe}
          className="px-3 py-1 text-xs text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded transition-colors flex items-center gap-1.5"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="4" y="0" width="2" height="10" />
            <rect x="0" y="4" width="10" height="2" />
          </svg>
          Add Keyframe
        </button>
      </div>

      {/* Body: Left sidebar (tabs) + Timeline track */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar: tab buttons */}
        <div className="w-20 border-r border-zinc-200 flex flex-col py-1 flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => editor.setActiveTab(tab.key)}
              className={`px-2 py-2 text-[11px] text-left transition-colors ${
                editor.activeTab === tab.key
                  ? "text-zinc-900 font-medium"
                  : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
              }`}
              style={
                editor.activeTab === tab.key
                  ? {
                      backgroundColor: tab.color + "15",
                      borderRight: `2px solid ${tab.color}`,
                    }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}

          {/* Shift-click hint for model tab */}
          {editor.activeTab === "model" && (
            <div className="mt-auto px-2 py-2 text-[9px] text-zinc-300 leading-tight">
              Shift-click 2 keyframes to add a transition
            </div>
          )}
        </div>

        {/* Timeline track */}
        <TimelineTrack editor={editor} />
      </div>
    </div>
  );
}
