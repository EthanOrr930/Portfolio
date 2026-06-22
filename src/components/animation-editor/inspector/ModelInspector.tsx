"use client";

import { useState, useCallback, useRef } from "react";
import type { ModelKeyframe } from "@/lib/animation/types";
import {
  type ProcessingParams,
  DEFAULT_PROCESSING_PARAMS,
  type ProcessingResult,
  type ProgressInfo,
} from "@/lib/geometry/types";
import { loadModel } from "@/lib/geometry/ModelLoader";
import { processGeometry } from "@/lib/geometry/ModelGeometryProcessor";
import { encodeEXR } from "@/lib/geometry/exrWriter";
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

export interface ProcessedPreview {
  positions: Float32Array;
  scales: Float32Array;
  count: number;
  modelName: string;
  params: ProcessingParams;
}

interface ModelInspectorProps {
  keyframe: ModelKeyframe | undefined;
  onKeyframeChange: (updates: Partial<ModelKeyframe>) => void;
  onDelete: () => void;
  onProcessed: (exrPath: string, positionCount: number, params: ProcessingParams) => void;
  /** Callback to send processed preview data to the canvas */
  onPreviewReady: (preview: ProcessedPreview | null) => void;
  currentVh: number;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="mb-2">
      <label className="text-[11px] text-zinc-500 block mb-0.5">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-800 tabular-nums focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200"
      />
      {hint && <div className="text-[9px] text-zinc-400 mt-0.5">{hint}</div>}
    </div>
  );
}

export function ModelInspector({
  keyframe,
  onKeyframeChange,
  onDelete,
  onProcessed,
  onPreviewReady,
  currentVh,
}: ModelInspectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelSource, setModelSource] = useState<File | string | null>(null);
  const [modelName, setModelName] = useState<string>("");
  const [params, setParams] = useState<ProcessingParams>(DEFAULT_PROCESSING_PARAMS);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPreview, setHasPreview] = useState(false);
  const lastResultRef = useRef<ProcessingResult | null>(null);

  // Decode an EXR File into positions/scales so we can skip the whole
  // sample-and-bake pipeline when the user already has a baked texture.
  const decodeExrFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const loader = new EXRLoader();
    loader.setDataType(THREE.FloatType);
    const parsed = loader.parse(buffer) as unknown as {
      data: Float32Array;
      width: number;
      height: number;
    };
    const raw = parsed.data;
    const totalPixels = parsed.width * parsed.height;

    // Count real (non-padding) entries — padding is written with scale<=0.
    let realCount = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (raw[i * 4 + 3] > 0) realCount++;
    }
    if (realCount === 0) realCount = totalPixels;

    const positions = new Float32Array(realCount * 3);
    const scales = new Float32Array(realCount);
    let write = 0;
    for (let i = 0; i < totalPixels; i++) {
      const a = raw[i * 4 + 3];
      if (a <= 0 && realCount !== totalPixels) continue;
      positions[write * 3]     = raw[i * 4];
      positions[write * 3 + 1] = raw[i * 4 + 1];
      positions[write * 3 + 2] = raw[i * 4 + 2];
      scales[write] = a > 0 ? a : 0.8;
      write++;
    }
    return { positions, scales, count: realCount };
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setHasPreview(false);
      onPreviewReady(null);
      lastResultRef.current = null;

      const name = file.name.replace(/\.[^.]+$/, "");
      setModelName(name);
      setModelSource(file);

      // Fast path: the user handed us an already-baked EXR. Decode it so
      // the preview panel can render it immediately; committing just
      // re-uploads the same bytes.
      if (file.name.toLowerCase().endsWith(".exr")) {
        try {
          setProcessing(true);
          setProgress({ stage: "Decoding EXR...", progress: 0.5 });
          const { positions, scales, count } = await decodeExrFile(file);
          // Pre-baked EXRs don't carry normals/curvature/order — stub them
          // with empty arrays since only positions/scales/count are read
          // downstream (preview + commit both ignore the rest).
          lastResultRef.current = {
            positions,
            scales,
            count,
            normals: new Float32Array(count * 3),
            colors: new Float32Array(count * 3),
            curvatures: new Float32Array(count),
            order: new Float32Array(count),
          };
          onPreviewReady({ positions, scales, count, modelName: name, params });
          setHasPreview(true);
          setProgress(null);
        } catch (err) {
          console.error("[ModelInspector] EXR decode error:", err);
          setError(err instanceof Error ? err.message : "Failed to read EXR");
          setProgress(null);
        } finally {
          setProcessing(false);
        }
      }
    },
    [decodeExrFile, onPreviewReady, params],
  );

  // Process model — generates preview but does NOT save the EXR yet
  const handleProcess = useCallback(async () => {
    if (!modelSource) return;
    setProcessing(true);
    setError(null);
    setHasPreview(false);
    onPreviewReady(null);
    setProgress({ stage: "Loading model...", progress: 0 });

    try {
      const geo = await loadModel(modelSource);
      const result = await processGeometry(geo, params, setProgress);

      lastResultRef.current = result;

      // Send preview data to the canvas immediately (no EXR round-trip)
      onPreviewReady({
        positions: result.positions,
        scales: result.scales,
        count: result.count,
        modelName,
        params,
      });
      setHasPreview(true);
      setProgress(null);
    } catch (err) {
      console.error("[ModelInspector] Error:", err);
      setError(err instanceof Error ? err.message : "Processing failed");
      setProgress(null);
    } finally {
      setProcessing(false);
    }
  }, [modelSource, params, modelName, onPreviewReady]);

  // Save the processed result as an EXR and commit it to the keyframe
  const handleCommit = useCallback(async () => {
    const result = lastResultRef.current;
    if (!result) return;

    setProcessing(true);
    setProgress({ stage: "Encoding EXR...", progress: 0.9 });

    try {
      const count = result.count;
      let exrBuffer: ArrayBuffer;

      // If the source was already an EXR, skip re-encoding and just reuse
      // the original bytes — it's the same data round-tripped through the
      // decoder and back.
      if (modelSource instanceof File && modelSource.name.toLowerCase().endsWith(".exr")) {
        exrBuffer = await modelSource.arrayBuffer();
      } else {
        const rChannel = new Float32Array(count);
        const gChannel = new Float32Array(count);
        const bChannel = new Float32Array(count);
        const aChannel = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          rChannel[i] = result.positions[i * 3];
          gChannel[i] = result.positions[i * 3 + 1];
          bChannel[i] = result.positions[i * 3 + 2];
          aChannel[i] = result.scales[i];
        }
        exrBuffer = encodeEXR(count, 1, rChannel, gChannel, bChannel, aChannel);
      }

      const safeName = modelName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      const exrPath = `textures/${safeName}_${Date.now()}.exr`;

      setProgress({ stage: "Saving EXR...", progress: 0.95 });
      const bytes = new Uint8Array(exrBuffer);
      const chunkSize = 8192;
      let binaryStr = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binaryStr += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binaryStr);

      const resp = await fetch("/api/write-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: exrPath, content: base64, encoding: "base64" }),
      });

      if (!resp.ok) throw new Error("Failed to save EXR file");

      onProcessed(exrPath, count, params);
      setProgress(null);
      setHasPreview(false);
      onPreviewReady(null);
      lastResultRef.current = null;
    } catch (err) {
      console.error("[ModelInspector] Commit error:", err);
      setError(err instanceof Error ? err.message : "Save failed");
      setProgress(null);
    } finally {
      setProcessing(false);
    }
  }, [modelName, params, onProcessed, onPreviewReady]);

  const updateParam = useCallback(
    <K extends keyof ProcessingParams>(key: K, value: ProcessingParams[K]) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const lloydWarning = params.lloydPasses > 5 && params.sampleCount > 8000;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
          Model
        </h3>
        {keyframe && (
          <button
            onClick={onDelete}
            className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {keyframe && (
        <div className="mb-3 p-2 bg-zinc-50 rounded border border-zinc-100 text-[11px]">
          <div className="text-zinc-500">
            Label:{" "}
            <input
              value={keyframe.label}
              onChange={(e) => onKeyframeChange({ label: e.target.value })}
              className="bg-transparent border-b border-zinc-200 text-zinc-800 px-1 focus:outline-none focus:border-zinc-400"
            />
          </div>
          <div className="text-zinc-400 mt-1">EXR: {keyframe.exrPath}</div>
          <div className="text-zinc-400">Points: {keyframe.positionCount}</div>
        </div>
      )}

      <div className="border-t border-zinc-100 pt-3">
        <h4 className="text-[11px] text-zinc-500 mb-2">Import Model</h4>
        <input
          ref={fileInputRef}
          type="file"
          accept=".obj,.glb,.gltf,.exr"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded transition-colors"
        >
          {modelSource ? `Selected: ${modelName}` : "Choose OBJ / GLTF / GLB / EXR"}
        </button>
      </div>

      {modelSource && !(modelSource instanceof File && modelSource.name.toLowerCase().endsWith(".exr")) && (
        <div className="border-t border-zinc-100 pt-3 mt-3">
          <h4 className="text-[11px] text-zinc-500 mb-2">Processing Settings</h4>

          <NumberInput
            label="Sample Count"
            value={params.sampleCount}
            onChange={(v) => updateParam("sampleCount", Math.max(100, v))}
            min={100}
            max={50000}
            step={500}
          />
          <NumberInput
            label="Lloyd Passes"
            value={params.lloydPasses}
            onChange={(v) => updateParam("lloydPasses", Math.max(0, v))}
            min={0}
            max={20}
            hint={lloydWarning ? "⚠ High passes + samples = slow" : undefined}
          />
          <NumberInput
            label="Curvature K"
            value={params.curvatureK}
            onChange={(v) => updateParam("curvatureK", Math.max(1, v))}
            min={1}
            max={30}
          />
          <NumberInput
            label="Curvature Threshold"
            value={params.curvatureThreshold}
            onChange={(v) => updateParam("curvatureThreshold", v)}
            min={0}
            max={1}
            step={0.05}
          />
          <NumberInput
            label="Noise Frequency"
            value={params.noiseFreq}
            onChange={(v) => updateParam("noiseFreq", v)}
            min={0}
            max={5}
            step={0.1}
          />

          {/* Process button — generates preview */}
          {!hasPreview && (
            <button
              onClick={handleProcess}
              disabled={processing}
              className="w-full mt-2 px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-300 disabled:text-zinc-500 rounded transition-colors"
            >
              {processing ? "Processing..." : "Process Model"}
            </button>
          )}
        </div>
      )}

      {/* Preview + commit block — shared between processed models and
          pre-baked EXR uploads (which skip the processing settings entirely). */}
      {modelSource && (hasPreview || progress || error) && (
        <div className="border-t border-zinc-100 pt-3 mt-3 space-y-2">
          {hasPreview && (
            <>
              <div className="text-[11px] text-emerald-600 font-medium">
                Preview ready — spinning in viewport
              </div>
              <button
                onClick={handleCommit}
                disabled={processing}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-300 disabled:text-zinc-500 rounded transition-colors"
              >
                {processing ? "Saving..." : "Save & Add to Keyframe"}
              </button>
              <button
                onClick={() => {
                  setHasPreview(false);
                  onPreviewReady(null);
                  lastResultRef.current = null;
                }}
                className="w-full px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded transition-colors"
              >
                Discard
              </button>
            </>
          )}

          {progress && (
            <div>
              <div className="text-[10px] text-zinc-500 mb-1">{progress.stage}</div>
              <div className="h-1.5 bg-zinc-100 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${Math.round(progress.progress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {error && <div className="text-[10px] text-red-500">{error}</div>}
        </div>
      )}
    </div>
  );
}
