"use client";

import { useState, useCallback, Suspense } from "react";
import { KeyframeList, type Selection } from "./KeyframeList";
import { EXRPicker } from "./EXRPicker";
import { ModelTransformConfig } from "./ModelTransformConfig";
import { TransitionConfig } from "./TransitionConfig";
import { DepthFadeConfig } from "./DepthFadeConfig";
import { TextOverlayEditor } from "./TextOverlayEditor";
import { TextStylePanel } from "./TextStylePanel";
import { ExportPageButton } from "./ExportPageButton";
import { ParticlePreview } from "./ParticlePreview";
import { createDefaultTextElement } from "@/lib/pages/defaults";
import type { PageData, KeyframeData, TextElement } from "@/lib/pages/types";

interface PageEditorProps {
  initialData: PageData;
}

export default function PageEditor({ initialData }: PageEditorProps) {
  const [pageData, setPageData] = useState<PageData>(initialData);
  const [selection, setSelection] = useState<Selection>({ type: "keyframe", index: 0 });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const keyframes = pageData.keyframes;

  // The keyframe shown in the preview — for transitions, show the source keyframe
  const previewIndex = selection.type === "keyframe" ? selection.index : selection.index;
  const previewKeyframe = keyframes[previewIndex] ?? null;

  // For the right sidebar: which keyframe are we editing?
  const activeKeyframeIndex = selection.type === "keyframe" ? selection.index : null;
  const activeKeyframe = activeKeyframeIndex !== null ? keyframes[activeKeyframeIndex] : null;

  // For transition editing: the destination keyframe holds the transition data
  const transitionIndex = selection.type === "transition" ? selection.index + 1 : null;
  const transitionKeyframe = transitionIndex !== null ? keyframes[transitionIndex] : null;

  const selectedElement = activeKeyframe?.elements.find(
    (el) => el.id === selectedElementId,
  ) ?? null;

  // ── Keyframe list operations ──────────────────────────────
  const setKeyframes = useCallback(
    (kfs: KeyframeData[]) => {
      setPageData((prev) => ({ ...prev, keyframes: kfs }));
    },
    [],
  );

  // ── Update a keyframe by index ────────────────────────────
  const updateKeyframe = useCallback(
    (index: number, updates: Partial<KeyframeData>) => {
      setPageData((prev) => ({
        ...prev,
        keyframes: prev.keyframes.map((kf, i) =>
          i === index ? { ...kf, ...updates } : kf,
        ),
      }));
    },
    [],
  );

  const updateActiveKeyframe = useCallback(
    (updates: Partial<KeyframeData>) => {
      if (activeKeyframeIndex === null) return;
      updateKeyframe(activeKeyframeIndex, updates);
    },
    [activeKeyframeIndex, updateKeyframe],
  );

  const updateTransitionKeyframe = useCallback(
    (updates: Partial<KeyframeData>) => {
      if (transitionIndex === null) return;
      updateKeyframe(transitionIndex, updates);
    },
    [transitionIndex, updateKeyframe],
  );

  // ── Text element operations ───────────────────────────────
  const addTextElement = useCallback(() => {
    if (!activeKeyframe) return;
    const newEl = createDefaultTextElement();
    updateActiveKeyframe({
      elements: [...activeKeyframe.elements, newEl],
    });
    setSelectedElementId(newEl.id);
  }, [activeKeyframe, updateActiveKeyframe]);

  const updateElement = useCallback(
    (id: string, updates: Partial<TextElement>) => {
      if (!activeKeyframe) return;
      updateActiveKeyframe({
        elements: activeKeyframe.elements.map((el) =>
          el.id === id ? { ...el, ...updates } : el,
        ),
      });
    },
    [activeKeyframe, updateActiveKeyframe],
  );

  const deleteElement = useCallback(
    (id: string) => {
      if (!activeKeyframe) return;
      updateActiveKeyframe({
        elements: activeKeyframe.elements.filter((el) => el.id !== id),
      });
      if (selectedElementId === id) setSelectedElementId(null);
    },
    [activeKeyframe, updateActiveKeyframe, selectedElementId],
  );

  return (
    <div className="fixed inset-0 flex bg-zinc-50">
      {/* ── Left sidebar: keyframe list ────────────────────── */}
      <div className="w-64 shrink-0 border-r border-zinc-200 p-4 space-y-6 overflow-y-auto">
        <h1 className="text-sm font-mono text-zinc-700">Page Editor</h1>

        <KeyframeList
          keyframes={keyframes}
          selection={selection}
          onSelect={(sel) => {
            setSelection(sel);
            setSelectedElementId(null);
          }}
          onChange={setKeyframes}
        />

        <ExportPageButton pageData={pageData} />
      </div>

      {/* ── Center: preview with text overlay ──────────────── */}
      <div className="flex-1 min-w-0 relative">
        {previewKeyframe && (
          <>
            <Suspense
              fallback={
                <div className="absolute inset-0 bg-[#f5f0eb] flex items-center justify-center">
                  <div className="w-4 h-4 bg-zinc-300 rounded-full animate-pulse" />
                </div>
              }
            >
              <ParticlePreview
                exrPath={
                  previewKeyframe.particles.exrPath.startsWith("blob:")
                    ? previewKeyframe.particles.exrPath
                    : `/${previewKeyframe.particles.exrPath}`
                }
                camera={previewKeyframe.particles.camera}
                modelPosition={previewKeyframe.particles.transform.position}
                modelRotation={previewKeyframe.particles.transform.rotation}
                modelScale={previewKeyframe.particles.transform.scale}
                depthFar={previewKeyframe.particles.depthFar ?? 3.5}
                depthNear={previewKeyframe.particles.depthNear ?? 1.8}
                className="absolute inset-0"
              />
            </Suspense>

            {activeKeyframe && (
              <>
                <TextOverlayEditor
                  elements={activeKeyframe.elements}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  onUpdateElement={updateElement}
                  onDeleteElement={deleteElement}
                />

                <button
                  onClick={addTextElement}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs font-mono rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors backdrop-blur-sm"
                >
                  + Add Text
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Right sidebar: properties ──────────────────────── */}
      <div className="w-64 shrink-0 border-l border-zinc-200 p-4 space-y-6 overflow-y-auto">
        {/* Keyframe selected → show EXR picker, depth fade, text style */}
        {activeKeyframe && (
          <>
            <EXRPicker
              value={activeKeyframe.particles.exrPath}
              onChange={(path) =>
                updateActiveKeyframe({
                  particles: { ...activeKeyframe.particles, exrPath: path },
                })
              }
              camera={activeKeyframe.particles.camera}
              onCameraChange={(camera) =>
                updateActiveKeyframe({
                  particles: { ...activeKeyframe.particles, camera },
                })
              }
              onImportComplete={({ path, camera, modelRotation }) =>
                updateActiveKeyframe({
                  particles: {
                    ...activeKeyframe.particles,
                    exrPath: path,
                    camera,
                    transform: { ...activeKeyframe.particles.transform, rotation: modelRotation },
                  },
                })
              }
            />

            <ModelTransformConfig
              transform={activeKeyframe.particles.transform}
              onChange={(transform) =>
                updateActiveKeyframe({
                  particles: { ...activeKeyframe.particles, transform },
                })
              }
            />

            <DepthFadeConfig
              particles={activeKeyframe.particles}
              onChange={(updates) =>
                updateActiveKeyframe({
                  particles: { ...activeKeyframe.particles, ...updates },
                })
              }
            />

            {selectedElement && (
              <TextStylePanel
                element={selectedElement}
                onChange={(updates) => updateElement(selectedElement.id, updates)}
              />
            )}
          </>
        )}

        {/* Transition selected → show transition config */}
        {transitionKeyframe && selection.type === "transition" && (
          <TransitionConfig
            keyframe={transitionKeyframe}
            onChange={updateTransitionKeyframe}
            fromLabel={keyframes[selection.index]?.label ?? "?"}
            toLabel={keyframes[selection.index + 1]?.label ?? "?"}
          />
        )}
      </div>
    </div>
  );
}
