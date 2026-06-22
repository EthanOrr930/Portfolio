"use client";

import { useState, useCallback } from "react";
import type { SceneData } from "@/lib/animation/types";
import { serializeSceneData } from "@/lib/animation/serializer";
import { sceneDataToPageData } from "@/lib/animation/converter";
import { serializePageData } from "@/lib/pages/serializer";

interface ExportBarProps {
  sceneData: SceneData;
}

export function ExportBar({ sceneData }: ExportBarProps) {
  const [status, setStatus] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setStatus("Saving...");
    try {
      const sceneJson = serializeSceneData(sceneData);
      const resp1 = await fetch("/api/write-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "pages/scene.json", content: sceneJson }),
      });
      if (!resp1.ok) throw new Error("Failed to save scene.json");

      const pageData = sceneDataToPageData(sceneData);
      const pageJson = serializePageData(pageData);
      const resp2 = await fetch("/api/write-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "pages/portfolio.json",
          content: pageJson,
        }),
      });
      if (!resp2.ok) throw new Error("Failed to save portfolio.json");

      setStatus("Saved!");
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setStatus(
        err instanceof Error ? `Error: ${err.message}` : "Save failed",
      );
      setTimeout(() => setStatus(null), 3000);
    }
  }, [sceneData]);

  const handlePushLive = useCallback(async () => {
    setStatus("Pushing...");
    try {
      await handleSave();

      const exrPaths = sceneData.model.keyframes
        .map((kf) => kf.exrPath)
        .filter((p) => p);

      const paths = [
        "pages/scene.json",
        "pages/portfolio.json",
        ...exrPaths,
      ];

      const resp = await fetch("/api/push-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });

      if (!resp.ok) throw new Error("Push failed");
      setStatus("Live!");
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setStatus(
        err instanceof Error ? `Error: ${err.message}` : "Push failed",
      );
      setTimeout(() => setStatus(null), 3000);
    }
  }, [sceneData, handleSave]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSave}
        className="px-3 py-1 text-xs text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded transition-colors"
      >
        Save
      </button>
      <button
        onClick={handlePushLive}
        className="px-3 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors"
      >
        Push Live
      </button>
      {status && (
        <span className="text-[11px] text-zinc-500">{status}</span>
      )}
    </div>
  );
}
