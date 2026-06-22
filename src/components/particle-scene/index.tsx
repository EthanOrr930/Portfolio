"use client";

import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { DEFAULT_TRANSFORM } from "./constants";
import { KeyboardController } from "./KeyboardController";
import { DragRotationController } from "./DragRotationController";
import { BrainWireframe } from "./BrainWireframe";
import { BackgroundGradient } from "./BackgroundGradient";
import { PostProcessing } from "./PostProcessing";
import { TransformMetadata } from "./TransformMetadata";
import { assetUrl } from "@/lib/assets";
import type { TransformState } from "./types";

interface SceneMetadata {
  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;
  cameraTargetX?: number;
  cameraTargetY?: number;
  cameraTargetZ?: number;
  cameraFov?: number;
  positionCount?: number;
}

function LoadingIndicator() {
  return (
    <div className="fixed inset-0 bg-[#f5f5f5] flex items-center justify-center">
      <div className="w-4 h-4 bg-zinc-300 rounded-full animate-pulse" />
    </div>
  );
}

export default function ParticleScene() {
  const [ready, setReady] = useState(false);
  const [transform, setTransform] = useState<TransformState>({ ...DEFAULT_TRANSFORM });
  const [meta, setMeta] = useState<SceneMetadata>({});

  const transformRef = useRef(transform);
  transformRef.current = transform;
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReady(true);
    fetch(assetUrl("/textures/positions.json"))
      .then((r) => (r.ok ? r.json() : {}))
      .then(setMeta)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const keyboard = new KeyboardController((pos) => {
      setTransform((prev) => ({ ...prev, position: pos }));
    });
    return keyboard.bind(() => transformRef.current.position);
  }, []);

  useEffect(() => {
    const canvas = canvasContainerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const drag = new DragRotationController(
      (rot) => setTransform((prev) => ({ ...prev, rotation: rot })),
      () => transformRef.current.rotation,
    );
    return drag.bind(canvas);
  }, [ready]);

  if (!ready) return <LoadingIndicator />;

  return (
    <div ref={canvasContainerRef} className="fixed inset-0">
      <Canvas
        camera={{
          position: [
            meta.cameraX ?? 0,
            meta.cameraY ?? 0,
            meta.cameraZ ?? 2.8,
          ],
          fov: meta.cameraFov ?? 50,
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
      >
        <BackgroundGradient />

        <Suspense fallback={null}>
          <BrainWireframe transform={transformRef} />
        </Suspense>

        <PostProcessing />
      </Canvas>

      <TransformMetadata transform={transform} />
    </div>
  );
}
