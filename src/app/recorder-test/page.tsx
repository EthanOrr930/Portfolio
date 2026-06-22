"use client";

// TEMP dev harness (owner: ethan, 2026-06) — recorder device + guided tutorial
// + device→laptop handoff. The device spins in from below (overshooting spring,
// ~10 decelerating turns) and springs aside as the project copy floats in; a
// leader walks through turn-on → record → finish, then on DONE it flies off-left
// and the laptop slides in.

import { useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { BackgroundGradient } from "@/components/particle-scene/BackgroundGradient";
import { RecorderShowcase } from "@/components/scroll-experience/projects/recorder/RecorderShowcase";
import { type CalloutDom } from "@/components/scroll-experience/projects/recorder/CalloutDriver";
import { RecorderTutorialOverlay } from "@/components/scroll-experience/projects/recorder/RecorderTutorialOverlay";
import { LaptopLeaderOverlay, type LeaderRef } from "@/components/scroll-experience/projects/recorder/LaptopLeaderOverlay";
import { ProjectThreeCopy } from "@/components/scroll-experience/projects/recorder/ProjectThreeCopy";

const SKY = "#f4efe7";

export default function RecorderTestPage() {
  const dom: CalloutDom = {
    circle: useRef<SVGCircleElement | null>(null),
    dot: useRef<SVGCircleElement | null>(null),
    line: useRef<SVGLineElement | null>(null),
    label: useRef<HTMLDivElement | null>(null),
  };
  const laptopLeaders: LeaderRef[] = [
    { line: useRef<SVGLineElement | null>(null), label: useRef<HTMLDivElement | null>(null) },
  ];
  const [copyShown, setCopyShown] = useState(false); // project copy: visible only for the recorder part

  return (
    <div style={{ position: "fixed", inset: 0, background: SKY }}>
      <Canvas
        camera={{ position: [0, 0.5, 26], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <BackgroundGradient />
        <hemisphereLight args={["#fbf7f0", "#8b8377", 1.0]} />
        <directionalLight position={[6, 10, 8]} intensity={1.7} color="#fff6e8" />
        <directionalLight position={[-8, 4, -6]} intensity={0.45} color="#cfd6e0" />
        <Suspense fallback={null}>
          <RecorderShowcase
            dom={dom}
            laptopLeaders={laptopLeaders}
            onRecorderReady={() => setCopyShown(true)}
            onHandoffStart={() => setCopyShown(false)}
          />
        </Suspense>
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.92} luminanceSmoothing={0.2} />
          <Vignette offset={0.4} darkness={0.32} blendFunction={BlendFunction.NORMAL} />
        </EffectComposer>
      </Canvas>
      <RecorderTutorialOverlay dom={dom} />
      <LaptopLeaderOverlay leaders={laptopLeaders} />
      <ProjectThreeCopy shown={copyShown} />
    </div>
  );
}
