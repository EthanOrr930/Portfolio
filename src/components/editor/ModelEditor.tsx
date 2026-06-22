"use client";

import { useState, useCallback, useRef } from "react";
import { ModelPicker } from "./ModelPicker";
import { ProcessingControls } from "./ProcessingControls";
import { ProcessingProgress } from "./ProcessingProgress";
import { RotationControls } from "./RotationControls";
import { ExportPanel } from "./ExportPanel";
import { EditorPreview, type CameraState } from "./EditorPreview";
import { loadModel } from "@/lib/geometry/ModelLoader";
import { processGeometry } from "@/lib/geometry/ModelGeometryProcessor";
import {
  DEFAULT_PROCESSING_PARAMS,
  type ProcessingParams,
  type ProcessingResult,
  type ProgressInfo,
} from "@/lib/geometry/types";

export default function ModelEditor() {
  const [selected, setSelected] = useState<string | File | null>(null);
  const [params, setParams] = useState<ProcessingParams>({
    ...DEFAULT_PROCESSING_PARAMS,
  });
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const cameraRef = useRef<CameraState>({ position: [0, 0, 2.8], rotation: [0, 0, 0], fov: 50 });
  const processingRef = useRef(false);

  const handleCameraChange = useCallback((state: CameraState) => {
    cameraRef.current = state;
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selected || processingRef.current) return;
    processingRef.current = true;
    setError(null);
    setProgress({ stage: "Loading model", progress: 0 });

    try {
      const geo = await loadModel(selected);
      const result = await processGeometry(geo, params, setProgress);
      setResult(result);
      setProgress(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed");
      setProgress(null);
    } finally {
      processingRef.current = false;
    }
  }, [selected, params]);

  const isProcessing = progress !== null;

  return (
    <div className="fixed inset-0 flex bg-zinc-50">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-zinc-200 p-4 space-y-6 overflow-y-auto">
        <h1 className="text-sm font-mono text-zinc-700">Model Editor</h1>

        <ModelPicker
          selected={selected}
          onSelect={setSelected}
          disabled={isProcessing}
        />

        <RotationControls
          rotation={rotation}
          onChange={setRotation}
          disabled={isProcessing}
        />

        <ProcessingControls
          params={params}
          onChange={setParams}
          onProcess={handleProcess}
          disabled={isProcessing}
          hasModel={selected !== null}
        />

        {progress && <ProcessingProgress info={progress} />}

        {error && (
          <p className="text-xs font-mono text-red-400/80">{error}</p>
        )}

        <ExportPanel
          result={result}
          modelName={
            selected instanceof File
              ? selected.name
              : typeof selected === "string"
                ? selected.split("/").pop() ?? null
                : null
          }
          cameraRef={cameraRef}
          modelRotation={rotation}
        />
      </div>

      {/* Preview */}
      <div className="flex-1 min-w-0">
        <EditorPreview
          result={result}
          rotation={rotation}
          onCameraChange={handleCameraChange}
        />
      </div>
    </div>
  );
}
