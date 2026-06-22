"use client";

import { useCallback, useState } from "react";
import type { SceneData } from "@/lib/animation/types";
import { useAnimationEditor } from "./state/useAnimationEditor";
import { usePlayback } from "./state/usePlayback";
import { useCameraCapture } from "./preview/useCameraCapture";
import { useTransformCapture } from "./preview/useTransformCapture";
import { Timeline } from "./timeline/Timeline";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { EditorCanvas } from "./preview/EditorCanvas";
import { getMaxVh } from "@/lib/animation/interpolation";
import { ExportBar } from "./ExportBar";
import type { ProcessedPreview } from "./inspector/ModelInspector";

interface AnimationEditorProps {
  initialData: SceneData;
}

export default function AnimationEditor({ initialData }: AnimationEditorProps) {
  const editor = useAnimationEditor(initialData);
  const { cameraRef, capture: captureCamera } = useCameraCapture();
  const { meshRef: transformMeshRef, capture: captureTransform } =
    useTransformCapture();
  const [processedPreview, setProcessedPreview] =
    useState<ProcessedPreview | null>(null);

  const maxVh = getMaxVh(editor.sceneData);
  const playback = usePlayback({
    maxVh,
    speed: 0.5,
    onVhChange: editor.setCurrentVh,
  });

  const handleTogglePlay = useCallback(() => {
    playback.togglePlay(editor.currentVh);
  }, [playback, editor.currentVh]);

  return (
    <div className="fixed inset-0 flex flex-col bg-white text-zinc-900">
      {/* Top bar */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-zinc-200 bg-zinc-50 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Animation Editor
        </span>
        <ExportBar sceneData={editor.sceneData} />
      </div>

      {/* Preview + Inspector */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative">
          <EditorCanvas
            editor={editor}
            cameraRef={cameraRef}
            transformMeshRef={transformMeshRef}
            isPlaying={playback.isPlaying}
            processedPreview={processedPreview}
          />
        </div>
        <div className="w-72 border-l border-zinc-200 overflow-y-auto bg-zinc-50">
          <InspectorPanel
            editor={editor}
            onPreviewReady={setProcessedPreview}
          />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div className="h-[280px] border-t border-zinc-200 flex-shrink-0">
        <Timeline
          editor={editor}
          captureCamera={captureCamera}
          captureTransform={captureTransform}
          playback={playback}
          onTogglePlay={handleTogglePlay}
        />
      </div>
    </div>
  );
}
