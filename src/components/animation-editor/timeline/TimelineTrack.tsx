"use client";

import { useRef, useCallback } from "react";
import type { AnimationEditorState } from "../state/useAnimationEditor";
import { KeyframeDiamond } from "./KeyframeDiamond";
import { TransitionBlock } from "./TransitionBlock";
import { Playhead } from "./Playhead";
import { TimelineRuler } from "./TimelineRuler";
import { PIXELS_PER_VH, TIMELINE_PADDING_VH } from "./useTimelineDrag";
import { getMaxVh } from "@/lib/animation/interpolation";

interface TimelineTrackProps {
  editor: AnimationEditorState;
}

const TAB_COLORS = {
  camera: "#f59e0b",
  transform: "#3b82f6",
  model: "#10b981",
};

export function TimelineTrack({ editor }: TimelineTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { activeTab, sceneData, selection, currentVh, shiftSelectedIds } =
    editor;

  const maxVh = getMaxVh(sceneData);
  const totalWidth = Math.max(
    (maxVh + TIMELINE_PADDING_VH) * PIXELS_PER_VH,
    1200,
  );

  const color = TAB_COLORS[activeTab];
  const showTransitionRow = activeTab === "model";

  // Get keyframes for the active tab
  const keyframes =
    activeTab === "camera"
      ? sceneData.camera.keyframes
      : activeTab === "transform"
        ? sceneData.transform.keyframes
        : sceneData.model.keyframes;

  // Handle keyframe click (with shift-key awareness)
  const handleKeyframeClick = useCallback(
    (id: string, shiftKey: boolean) => {
      if (shiftKey && activeTab === "model") {
        // Shift-click: toggle shift-selection for transition pairing
        editor.toggleShiftSelect(id);
        return;
      }

      // Normal click: clear shift selection, do regular selection
      editor.clearShiftSelect();
      const selType =
        activeTab === "camera"
          ? "camera-keyframe"
          : activeTab === "transform"
            ? "transform-keyframe"
            : "model-keyframe";
      editor.setSelection({ type: selType as any, id });
    },
    [activeTab, editor],
  );

  // Handle keyframe drag
  const handleKeyframeDrag = useCallback(
    (id: string, newVh: number) => {
      if (activeTab === "camera") {
        editor.updateCameraKeyframe(id, { vh: newVh });
      } else if (activeTab === "transform") {
        editor.updateTransformKeyframe(id, { vh: newVh });
      } else {
        editor.updateModelKeyframe(id, { vh: newVh });
      }
    },
    [activeTab, editor],
  );

  // Handle transition block click
  const handleTransitionClick = useCallback(
    (id: string) => {
      editor.clearShiftSelect();
      editor.setSelection({ type: "model-transition", id });
    },
    [editor],
  );

  // Handle keyframe delete
  const handleKeyframeDelete = useCallback(
    (id: string) => {
      if (activeTab === "camera") {
        editor.deleteCameraKeyframe(id);
      } else if (activeTab === "transform") {
        editor.deleteTransformKeyframe(id);
      } else {
        editor.deleteModelKeyframe(id);
      }
    },
    [activeTab, editor],
  );

  // Handle transition delete
  const handleTransitionDelete = useCallback(
    (id: string) => {
      editor.deleteModelTransition(id);
    },
    [editor],
  );

  // Handle transition wall offset changes
  const handleStartOffsetChange = useCallback(
    (id: string, offset: number) => {
      editor.updateModelTransition(id, { startOffset: offset });
    },
    [editor],
  );

  const handleEndOffsetChange = useCallback(
    (id: string, offset: number) => {
      editor.updateModelTransition(id, { endOffset: offset });
    },
    [editor],
  );

  // Handle clicking empty track area to set playhead
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const scrollLeft = trackRef.current.parentElement?.scrollLeft ?? 0;
      const localX = e.clientX - rect.left + scrollLeft;
      const vh = Math.max(0, localX / PIXELS_PER_VH);
      editor.setCurrentVh(Math.round(vh * 10) / 10);
    },
    [editor],
  );

  const selectedId =
    selection.type === "camera-keyframe" ||
    selection.type === "transform-keyframe" ||
    selection.type === "model-keyframe"
      ? selection.id
      : null;

  const selectedTransitionId =
    selection.type === "model-transition" ? selection.id : null;

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
      <div style={{ width: totalWidth, minHeight: "100%" }}>
        {/* Ruler */}
        <TimelineRuler totalWidth={totalWidth} />

        {/* Keyframe row */}
        <div
          ref={trackRef}
          className="relative cursor-crosshair border-b border-zinc-100"
          style={{ height: 36 }}
          onClick={handleTrackClick}
        >
          {keyframes.map((kf) => (
            <KeyframeDiamond
              key={kf.id}
              id={kf.id}
              vh={kf.vh}
              selected={selectedId === kf.id}
              shiftSelected={shiftSelectedIds.includes(kf.id)}
              color={color}
              onClick={handleKeyframeClick}
              onDrag={handleKeyframeDrag}
              onDelete={handleKeyframeDelete}
              containerRef={trackRef}
            />
          ))}

          {/* Playhead (spans both rows via absolute positioning from parent) */}
          <Playhead currentVh={currentVh} />
        </div>

        {/* Transition row (model tab only) */}
        {showTransitionRow && (
          <div
            className="relative cursor-crosshair"
            style={{ height: 36 }}
            onClick={handleTrackClick}
          >
            {sceneData.model.transitions.map((t) => {
              const fromKf = sceneData.model.keyframes.find(
                (kf) => kf.id === t.fromKeyframeId,
              );
              const toKf = sceneData.model.keyframes.find(
                (kf) => kf.id === t.toKeyframeId,
              );
              if (!fromKf || !toKf) return null;
              return (
                <TransitionBlock
                  key={t.id}
                  id={t.id}
                  fromVh={Math.min(fromKf.vh, toKf.vh)}
                  toVh={Math.max(fromKf.vh, toKf.vh)}
                  startOffset={t.startOffset ?? 0}
                  endOffset={t.endOffset ?? 0}
                  selected={selectedTransitionId === t.id}
                  onClick={handleTransitionClick}
                  onDelete={handleTransitionDelete}
                  onStartOffsetChange={handleStartOffsetChange}
                  onEndOffsetChange={handleEndOffsetChange}
                />
              );
            })}

            {/* Playhead continuation in transition row */}
            <Playhead currentVh={currentVh} />

            {/* Row label */}
            <div className="absolute left-1 top-1 text-[9px] text-zinc-300 pointer-events-none select-none">
              transitions
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
