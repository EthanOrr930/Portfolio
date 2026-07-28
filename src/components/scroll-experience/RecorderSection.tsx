"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { BackgroundGradient } from "@/components/particle-scene/BackgroundGradient";
import { RecorderShowcase } from "./projects/recorder/RecorderShowcase";
import { type CalloutDom } from "./projects/recorder/CalloutDriver";
import { RecorderTutorialOverlay } from "./projects/recorder/RecorderTutorialOverlay";
import { LaptopLeaderOverlay, type LeaderRef } from "./projects/recorder/LaptopLeaderOverlay";
import { ProjectThreeCopy } from "./projects/recorder/ProjectThreeCopy";
import { onRecorderIntro, onRecorderReset } from "./projects/recorder/recorderSignal";

const SKY = "#f4efe7";
const CAMERA = { position: [0, 0.5, 26] as [number, number, number], fov: 40 };
const GL = { antialias: true, toneMapping: THREE.ACESFilmicToneMapping };
// Scroll this far back UP past where the spin-in armed and it interrupts —
// hands control back to the city. Small so it reacts the moment you reverse.
const DISARM_MARGIN = 0.35;

interface RecorderSectionProps {
  scrollVhRef: React.RefObject<number>;
  /** Mount (warm up) the Canvas once scrolled past this vh. */
  mountVh: number;
  /** Fast-scroll backstop: arm the spin-in by here even if the signal was missed. */
  fallbackVh: number;
}

/**
 * Project 3 as a scroll section — the same recorder showcase as /recorder-test,
 * but its spin-in is gated: it fires the instant the Clad-in-Plaid copy exits
 * (via recorderSignal), so the city dissolves and the device spins up in the
 * same cream space with no dead scroll gap. Own Canvas (cream sky, ACES + Bloom)
 * gated near its window; the interactive flow (turn on → record → laptop handoff)
 * is identical to the harness.
 */
export function RecorderSection({ scrollVhRef, mountVh, fallbackVh }: RecorderSectionProps) {
  const dom = useCalloutDom();
  const laptopLeaders = useLaptopLeaders();
  const introArmRef = useRef(false);
  const armVhRef = useRef(0); // the vh where the spin-in armed (for scroll-up interrupt)
  const [active, setActive] = useState(false);
  const [entered, setEntered] = useState(false);
  const [copyShown, setCopyShown] = useState(false);
  const [interactive, setInteractive] = useState(false);

  const arm = useCallback(() => {
    if (introArmRef.current) return;
    introArmRef.current = true;
    armVhRef.current = scrollVhRef.current ?? 0;
    setEntered(true);
  }, [scrollVhRef]);
  const disarm = useCallback(() => {
    introArmRef.current = false;
    setEntered(false);
    setCopyShown(false);
    setInteractive(false);
  }, []);

  useRecorderArming({ scrollVhRef, mountVh, fallbackVh, introArmRef, armVhRef, setActive, arm, disarm });

  const onReady = useCallback(() => {
    setCopyShown(true);
    setInteractive(true);
  }, []);
  const onHandoff = useCallback(() => {
    setCopyShown(false);
    setInteractive(false);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40" style={fadeStyle(entered, interactive)}>
        {active && (
          <Canvas
            camera={CAMERA}
            dpr={[1, 1.5]}
            gl={GL}
            // R3F hardcodes the Canvas wrapper to pointer-events:auto, which
            // overrides this z-40 layer's own `none` — so a full-screen canvas
            // that mounts a beat before the city copy exits (mountVh precedes the
            // copy slide-out) swallows clicks meant for the z-30 Clad-in-Plaid
            // Play button. Track the same `interactive` flag as the layer so the
            // canvas only grabs pointers during the recorder's own finale.
            // Mirrors CitySection's canvas pe:none fix.
            style={{ background: "transparent", pointerEvents: interactive ? "auto" : "none" }}
          >
            <RecorderStage dom={dom} laptopLeaders={laptopLeaders} introArmRef={introArmRef} onReady={onReady} onHandoff={onHandoff} />
          </Canvas>
        )}
      </div>
      <div className="fixed inset-0 z-50" style={overlayStyle(entered)}>
        <RecorderTutorialOverlay dom={dom} />
        <LaptopLeaderOverlay leaders={laptopLeaders} />
        <ProjectThreeCopy shown={copyShown} />
      </div>
    </>
  );
}

/** In-Canvas scene — lights + showcase + post, matching /recorder-test exactly. */
function RecorderStage({
  dom,
  laptopLeaders,
  introArmRef,
  onReady,
  onHandoff,
}: {
  dom: CalloutDom;
  laptopLeaders: LeaderRef[];
  introArmRef: React.RefObject<boolean>;
  onReady: () => void;
  onHandoff: () => void;
}) {
  return (
    <>
      <BackgroundGradient />
      <hemisphereLight args={["#fbf7f0", "#8b8377", 1.0]} />
      <directionalLight position={[6, 10, 8]} intensity={1.7} color="#fff6e8" />
      <directionalLight position={[-8, 4, -6]} intensity={0.45} color="#cfd6e0" />
      <Suspense fallback={null}>
        <RecorderShowcase
          dom={dom}
          laptopLeaders={laptopLeaders}
          introArmRef={introArmRef}
          onRecorderReady={onReady}
          onHandoffStart={onHandoff}
        />
      </Suspense>
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.92} luminanceSmoothing={0.2} />
        <Vignette offset={0.4} darkness={0.32} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    </>
  );
}

interface ArmingArgs {
  scrollVhRef: React.RefObject<number>;
  mountVh: number;
  fallbackVh: number;
  introArmRef: React.RefObject<boolean>;
  armVhRef: React.RefObject<number>;
  setActive: (v: boolean) => void;
  arm: () => void;
  disarm: () => void;
}

/** Wires the city→recorder signal (exact sync) plus vh backstops (fast scroll). */
function useRecorderArming({ scrollVhRef, mountVh, fallbackVh, introArmRef, armVhRef, setActive, arm, disarm }: ArmingArgs): void {
  useEffect(() => {
    const offIntro = onRecorderIntro(arm);
    const offReset = onRecorderReset(disarm);
    return () => {
      offIntro();
      offReset();
    };
  }, [arm, disarm]);

  useEffect(() => {
    const onScroll = () => {
      const vh = scrollVhRef.current ?? 0;
      setActive(vh > mountVh);
      if (introArmRef.current) {
        // Scrolling back up past where it armed interrupts the spin-in and hands
        // control to the city — works even if the city Canvas already unmounted
        // (so its reset signal can't fire). Below mountVh always disarms.
        if (vh < armVhRef.current - DISARM_MARGIN || vh < mountVh) disarm();
      } else if (vh > fallbackVh) {
        arm();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollVhRef, mountVh, fallbackVh, introArmRef, armVhRef, setActive, arm, disarm]);
}

function useCalloutDom(): CalloutDom {
  return {
    circle: useRef<SVGCircleElement | null>(null),
    dot: useRef<SVGCircleElement | null>(null),
    line: useRef<SVGLineElement | null>(null),
    label: useRef<HTMLDivElement | null>(null),
  };
}

function useLaptopLeaders(): LeaderRef[] {
  const line = useRef<SVGLineElement | null>(null);
  const label = useRef<HTMLDivElement | null>(null);
  return [{ line, label }];
}

function fadeStyle(entered: boolean, interactive: boolean): CSSProperties {
  return {
    background: SKY,
    opacity: entered ? 1 : 0,
    transition: "opacity 700ms ease",
    pointerEvents: interactive ? "auto" : "none",
  };
}

function overlayStyle(entered: boolean): CSSProperties {
  return { opacity: entered ? 1 : 0, transition: "opacity 700ms ease", pointerEvents: "none" };
}
