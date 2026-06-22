"use client";

import { useState, type RefObject } from "react";
import { exportAsEXR } from "@/lib/geometry/exrWriter";
import type { ProcessingResult } from "@/lib/geometry/types";
import type { CameraState } from "./EditorPreview";

export function ExportPanel({
  result,
  modelName,
  cameraRef,
  modelRotation,
}: {
  result: ProcessingResult | null;
  modelName: string | null;
  cameraRef: RefObject<CameraState>;
  modelRotation?: [number, number, number];
}) {
  const [exported, setExported] = useState(false);

  if (!result) return null;

  const baseName = modelName
    ? modelName.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, "-")
    : "model";

  const handleExport = () => {
    // Read camera state at export time, not at render time
    const cam = cameraRef.current;
    exportAsEXR({
      positions: result.positions,
      scales: result.scales,
      count: result.count,
      filename: `${baseName}.exr`,
      cameraPosition: cam.position,
      cameraRotation: cam.rotation,
      cameraFov: cam.fov,
      modelRotation,
    });
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
        Export
      </h3>
      <p className="text-xs font-mono text-zinc-500">
        {result.count.toLocaleString()} positions
      </p>
      <button
        onClick={handleExport}
        className="w-full px-3 py-1.5 text-xs font-mono text-zinc-600 border border-zinc-300 rounded hover:bg-zinc-200 transition-colors"
      >
        {exported ? "Exported!" : `Export ${baseName}.exr`}
      </button>
      <p className="text-xs font-mono text-zinc-400">
        Place in public/textures/ and update POSITION_COUNT to {result.count}
      </p>
    </div>
  );
}
