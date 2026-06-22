"use client";

import { useState } from "react";
import { serializePageData } from "@/lib/pages/serializer";
import type { PageData } from "@/lib/pages/types";

interface ExportPageButtonProps {
  pageData: PageData;
}

async function writeFile(path: string, content: string, encoding: "utf8" | "base64" = "utf8") {
  const resp = await fetch("/api/write-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content, encoding }),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || "Write failed");
  }
  return resp.json();
}

async function pushLive(paths: string[]) {
  const resp = await fetch("/api/push-live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });
  const data = await resp.json();
  if (!data.ok) {
    const failures = data.results?.filter((r: { ok: boolean }) => !r.ok) ?? [];
    throw new Error(failures.map((f: { path: string; error?: string }) => `${f.path}: ${f.error}`).join("; ") || "Push failed");
  }
  return data;
}

export function ExportPageButton({ pageData }: ExportPageButtonProps) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pushStatus, setPushStatus] = useState<"idle" | "pushing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = async () => {
    setSaveStatus("saving");
    setErrorMsg("");
    try {
      const json = serializePageData(pageData);
      await writeFile("pages/portfolio.json", json);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Save failed:", e);
      setErrorMsg(e instanceof Error ? e.message : "Save failed");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handlePushLive = async () => {
    setPushStatus("pushing");
    setErrorMsg("");
    try {
      // First save locally
      const json = serializePageData(pageData);
      await writeFile("pages/portfolio.json", json);

      // Collect all files to push: the JSON + all unique EXR paths
      const paths = ["pages/portfolio.json"];
      const exrPaths = new Set(pageData.keyframes.map((kf) => kf.particles.exrPath));
      for (const exrPath of exrPaths) {
        // Only push local files, not blob URLs
        if (!exrPath.startsWith("blob:")) {
          paths.push(exrPath);
        }
      }

      await pushLive(paths);
      setPushStatus("done");
      setTimeout(() => setPushStatus("idle"), 2000);
    } catch (e) {
      console.error("Push failed:", e);
      setErrorMsg(e instanceof Error ? e.message : "Push failed");
      setPushStatus("error");
      setTimeout(() => setPushStatus("idle"), 3000);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
        Export
      </h3>
      <p className="text-[10px] font-mono text-zinc-400">
        {pageData.keyframes.length} keyframes
      </p>
      <div className="space-y-1.5">
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className="w-full px-2 py-1.5 text-xs font-mono rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "Saved!"
              : saveStatus === "error"
                ? "Save Failed"
                : "Save"}
        </button>
        <button
          onClick={handlePushLive}
          disabled={pushStatus === "pushing"}
          className="w-full px-2 py-1.5 text-xs font-mono rounded bg-blue-500/20 text-blue-300/70 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          {pushStatus === "pushing"
            ? "Pushing..."
            : pushStatus === "done"
              ? "Live!"
              : pushStatus === "error"
                ? "Push Failed"
                : "Push to Live"}
        </button>
      </div>
      {errorMsg && (
        <p className="text-[10px] font-mono text-red-400/70 break-all">{errorMsg}</p>
      )}
    </div>
  );
}
