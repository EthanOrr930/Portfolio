"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { Camera } from "three";
import type { AnimationEditorState } from "../state/useAnimationEditor";
import { CameraPreviewMode } from "./CameraPreviewMode";
import { TransformPreviewMode } from "./TransformPreviewMode";
import { ModelPreviewMode } from "./ModelPreviewMode";
import { CameraTracker } from "./CameraTracker";
import type { ProcessedPreview } from "../inspector/ModelInspector";

interface EditorCanvasProps {
  editor: AnimationEditorState;
  cameraRef: React.MutableRefObject<Camera | null>;
  transformMeshRef: React.MutableRefObject<THREE.Mesh | null>;
  isPlaying?: boolean;
  processedPreview?: ProcessedPreview | null;
}

export function EditorCanvas({
  editor,
  cameraRef,
  transformMeshRef,
  isPlaying = false,
  processedPreview,
}: EditorCanvasProps) {
  const { activeTab } = editor;
  const showComposed = isPlaying;

  const hasTransformSelection =
    activeTab === "transform" &&
    editor.selection.type === "transform-keyframe";

  return (
    <div className="absolute inset-0">
      {hasTransformSelection && (
        <div className="absolute top-3 left-3 z-10 flex gap-1 text-[10px] text-zinc-400 bg-white/80 backdrop-blur-sm rounded px-2 py-1 border border-zinc-200">
          <span>W: Move</span>
          <span className="text-zinc-300">|</span>
          <span>E: Rotate</span>
          <span className="text-zinc-300">|</span>
          <span>S: Scale</span>
        </div>
      )}
      <Canvas
        camera={{
          position: [0, 0, 2.8],
          fov: 50,
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
      >
        <CameraTracker cameraRef={cameraRef} />

        <Suspense fallback={null}>
          {showComposed ? (
            <ModelPreviewMode editor={editor} composedMode />
          ) : (
            <>
              {activeTab === "camera" && (
                <CameraPreviewMode editor={editor} />
              )}
              {activeTab === "transform" && (
                <TransformPreviewMode
                  editor={editor}
                  meshRef={transformMeshRef}
                />
              )}
              {activeTab === "model" && (
                <ModelPreviewMode
                  editor={editor}
                  processedPreview={processedPreview}
                />
              )}
            </>
          )}
        </Suspense>

        <ambientLight intensity={0.5} />
      </Canvas>
    </div>
  );
}
