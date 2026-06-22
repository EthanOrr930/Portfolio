"use client";

import type { RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { ProjectStageFX } from "./ProjectStageFX";

interface ProjectModelStageProps {
  children: React.ReactNode;
  scrollVhRef: RefObject<number>;
  /** Scroll vh where the projects reveal completes — drives the god-ray
   *  shaft fade-in so they don't pop at the panel edge. */
  revealBaseVh: number;
  /** Scroll vh where the cubes fall away — drives the shaft fade-out. */
  fallVh: number;
}

/**
 * The shared R3F canvas for every project's 3D model. Lives inside the
 * projects panel and covers its full viewport. Lighting, tone-mapping,
 * and camera are a single source of truth so every project reads as the
 * same stage.
 */
export function ProjectModelStage({
  children,
  scrollVhRef,
  revealBaseVh,
  fallVh,
}: ProjectModelStageProps) {
  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 0.15, 3.4], fov: 35 }}
      // DPR capped at 1: this is the second WebGL context on the page
      // (the scroll-experience particle canvas is already at [1, 2]).
      // Two retina contexts + two render loops was eating the framerate
      // on modest GPUs. Close-up product-photography framing hides the
      // 1:1 pixels easily; much cheaper.
      dpr={1}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
    >
      <StageLights />
      {children}
      <ProjectStageFX scrollVhRef={scrollVhRef} revealBaseVh={revealBaseVh} fallVh={fallVh} />
    </Canvas>
  );
}

function StageLights() {
  return (
    <>
      {/* Overhead key — strong, straight down, so the top face reads bright
          and the side faces fall into shade. Drives the primary modelling. */}
      <directionalLight position={[0.5, 9, 1.5]} intensity={2.8} color="#ffffff" />
      {/* Upper-front spot — keeps the top bevel + front face legible. */}
      <spotLight
        position={[3, 5, 5]}
        intensity={1.4}
        angle={0.6}
        penumbra={1}
        color="#ffffff"
      />
      {/* Fill — soft, opposite side, just lifts the shadow face off black. */}
      <spotLight
        position={[-4, 3, 4]}
        intensity={0.6}
        angle={0.7}
        penumbra={1}
        color="#fff4e0"
      />
      {/* Warm rim from below for depth. */}
      <pointLight position={[0, -2, 2]} intensity={0.25} color="#ffd9b0" />
      {/* Low ambient — lets the top-vs-side contrast actually show. */}
      <ambientLight intensity={0.3} />
    </>
  );
}
