"use client";

import { useCallback } from "react";
import type { AnimationEditorState } from "../state/useAnimationEditor";
import type { ProcessingParams } from "@/lib/geometry/types";
import { CameraInspector } from "./CameraInspector";
import { TransformInspector } from "./TransformInspector";
import { ModelInspector, type ProcessedPreview } from "./ModelInspector";
import { TransitionInspector } from "./TransitionInspector";

interface InspectorPanelProps {
  editor: AnimationEditorState;
  onPreviewReady?: (preview: ProcessedPreview | null) => void;
}

export function InspectorPanel({ editor, onPreviewReady }: InspectorPanelProps) {
  const { selection } = editor;

  // Camera
  const selectedCameraKf = editor.getSelectedCameraKeyframe();
  const handleCameraChange = useCallback(
    (updates: Parameters<typeof editor.updateCameraKeyframe>[1]) => {
      if (selection.type === "camera-keyframe") {
        editor.updateCameraKeyframe(selection.id, updates);
      }
    },
    [editor, selection],
  );
  const handleCameraDelete = useCallback(() => {
    if (selection.type === "camera-keyframe") {
      editor.deleteCameraKeyframe(selection.id);
    }
  }, [editor, selection]);

  // Transform
  const selectedTransformKf = editor.getSelectedTransformKeyframe();
  const handleTransformChange = useCallback(
    (updates: Parameters<typeof editor.updateTransformKeyframe>[1]) => {
      if (selection.type === "transform-keyframe") {
        editor.updateTransformKeyframe(selection.id, updates);
      }
    },
    [editor, selection],
  );
  const handleTransformDelete = useCallback(() => {
    if (selection.type === "transform-keyframe") {
      editor.deleteTransformKeyframe(selection.id);
    }
  }, [editor, selection]);

  // Model
  const selectedModelKf = editor.getSelectedModelKeyframe();
  const handleModelChange = useCallback(
    (updates: Parameters<typeof editor.updateModelKeyframe>[1]) => {
      if (selection.type === "model-keyframe") {
        editor.updateModelKeyframe(selection.id, updates);
      }
    },
    [editor, selection],
  );
  const handleModelDelete = useCallback(() => {
    if (selection.type === "model-keyframe") {
      editor.deleteModelKeyframe(selection.id);
    }
  }, [editor, selection]);
  const handleModelProcessed = useCallback(
    (exrPath: string, positionCount: number, params: ProcessingParams) => {
      if (selection.type === "model-keyframe") {
        editor.updateModelKeyframe(selection.id, {
          exrPath,
          positionCount,
          processingParams: params,
        });
      }
    },
    [editor, selection],
  );

  // Transition
  const selectedTransition = editor.getSelectedModelTransition();
  const handleTransitionChange = useCallback(
    (updates: Parameters<typeof editor.updateModelTransition>[1]) => {
      if (selection.type === "model-transition") {
        editor.updateModelTransition(selection.id, updates);
      }
    },
    [editor, selection],
  );
  const handleTransitionDelete = useCallback(() => {
    if (selection.type === "model-transition") {
      editor.deleteModelTransition(selection.id);
    }
  }, [editor, selection]);

  return (
    <div className="p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-4">
        Inspector
      </h2>

      {selectedCameraKf && (
        <CameraInspector
          keyframe={selectedCameraKf}
          onChange={handleCameraChange}
          onDelete={handleCameraDelete}
        />
      )}

      {selection.type === "transform-keyframe" && selectedTransformKf && (
        <TransformInspector
          keyframe={selectedTransformKf}
          onChange={handleTransformChange}
          onDelete={handleTransformDelete}
        />
      )}

      {selection.type === "model-keyframe" && (
        <ModelInspector
          keyframe={selectedModelKf}
          onKeyframeChange={handleModelChange}
          onDelete={handleModelDelete}
          onProcessed={handleModelProcessed}
          onPreviewReady={onPreviewReady ?? (() => {})}
          currentVh={editor.currentVh}
        />
      )}

      {selection.type === "model-transition" && selectedTransition && (
        <TransitionInspector
          transition={selectedTransition}
          onChange={handleTransitionChange}
          onDelete={handleTransitionDelete}
        />
      )}

      {selection.type === "none" && (
        <div className="text-zinc-400 text-xs leading-relaxed">
          Select a keyframe on the timeline to edit its properties, or click
          "Add Keyframe" to create one at the current playhead position.
        </div>
      )}
    </div>
  );
}
