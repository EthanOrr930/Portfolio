"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "../motionTokens";
import { BubbleField } from "./BubbleField";
import { CubeBounceResolver } from "./CubeBounce";
import { ProjectActiveProvider } from "./ProjectActiveContext";
import { ProjectStageDriver, type ProjectPhase, type Vec3 } from "./ProjectStageDriver";
import type { MouseNdc } from "./useMouseNdcRef";
import type { ProjectSide } from "./types";

// ── Shared physics / layout constants ─────────────────────────────
const MODEL_SCALE = 0.6;
const CUBE_HALF_SIDE_WORLD = MODEL_SCALE * 0.5;
const CUBE_MOMENT_OF_INERTIA = (1 / 6) * (MODEL_SCALE * MODEL_SCALE);
/** World-X magnitude for the cluster's center position (side-flipped).
 *  Per-cube specs' restOffset.x is a delta from this. */
const CLUSTER_CENTER_X = 0.78;
const ENTRANCE_Y = 3.2;

const BODY_CONFIG = {
  linearDrag: 2.1,
  angularDrag: 2.0,
  restSpringK: 6,
};

const MOUSE_CONFIG = {
  forceScale: 0.2,
  cornerLeverArm: CUBE_HALF_SIDE_WORLD,
  momentOfInertia: CUBE_MOMENT_OF_INERTIA,
  positionLerpAlphaPer60: 0.25,
  velocityLerpAlphaPer60: 0.3,
};

// One burst on the initial fall only — a big cloud of bubbles trails the
// cube as it drops, then no more spawn (they rise and dissipate).
const BUBBLE_EMISSION_DURATION = 1.3;
const BUBBLE_EMISSION_RATE = 396;
// Exit is a free-fall: constant downward accel (units/s²) so the cubes
// accelerate out of frame like gravity rather than easing to a stop.
const EXIT_GRAVITY = 22;

// ── Inter-cube collision ──────────────────────────────────────────
// The two cubes share a cluster and occasionally interpenetrate while
// wobbling / being pushed by the cursor. When one cube's edge actually
// intersects the other (oriented-bounding-box overlap, not a center-
// distance approximation), it bounces off very gently — a low-restitution
// velocity reflection plus a soft de-penetration push so they never stick.
const CUBE_BOUNCE_CONFIG = {
  halfSize: CUBE_HALF_SIDE_WORLD,
  restitution: 0.25,
  separationStrength: 14,
  slop: 0.002,
};

interface CubeSpec {
  restOffset: Vec3;
  extraEntranceY: number;
  entranceVelY: number;
  restPitch: number;
  restYaw: number;
  restRoll: number;
  entranceOmegaRange: number;
  entranceDelaySec: number;
  /** Seconds to delay this cube's fall on exit so the pair drops one
   *  before the other. */
  exitDelaySec: number;
  ambientAmp: number;
  ambientFreq: number;
  ambientPhase: number;
}

/** Two cubes per project — same size, staggered drop, offset rest,
 *  independent ambient turbulence so they wobble without lockstep. */
const CUBE_SPECS: readonly [CubeSpec, CubeSpec] = [
  {
    restOffset: { x: 0.35, y: 0.16, z: 0.2 },
    extraEntranceY: 0,
    entranceVelY: -3.4,
    restPitch: 0.22,
    restYaw: -0.35,
    restRoll: 0,
    entranceOmegaRange: 2.5,
    entranceDelaySec: 0,
    exitDelaySec: 0,
    ambientAmp: 0.22,
    ambientFreq: 1.1,
    ambientPhase: 0,
  },
  {
    restOffset: { x: -0.32, y: -0.14, z: -0.22 },
    extraEntranceY: 0.55,
    entranceVelY: -3.9,
    restPitch: 0.3,
    restYaw: 0.24,
    restRoll: 0,
    entranceOmegaRange: 2.8,
    entranceDelaySec: 0.32,
    exitDelaySec: 0.25,
    ambientAmp: 0.28,
    ambientFreq: 0.85,
    ambientPhase: 2.1,
  },
];

interface ProjectModelGroupsProps {
  side: ProjectSide;
  phase: ProjectPhase;
  mouseNdcRef: RefObject<MouseNdc>;
  /** Single mesh component — rendered once per cube. */
  children: React.ReactNode;
}

/**
 * Two independent cube bodies per project. Each has its own WaterPhysics-
 * Body + MouseCurrentApplier + BubbleSystem, tied together by a shared
 * phase prop and a shared mouse NDC ref (the mouse acts as a uniform
 * "current" that both cubes respond to, spinning each around whichever
 * corner is nearest the cursor).
 */
export function ProjectModelGroups({
  side,
  phase,
  mouseNdcRef,
  children,
}: ProjectModelGroupsProps) {
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const drivers = useRef<(ProjectStageDriver | null)[]>([null, null]);
  const bounce = useMemo(() => new CubeBounceResolver(CUBE_BOUNCE_CONFIG), []);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const [d0, d1] = drivers.current;
    if (d0 && d1) bounce.resolve(d0, d1, delta);
  });

  return (
    <>
      <CubeBody
        spec={CUBE_SPECS[0]}
        index={0}
        driversRef={drivers}
        side={side}
        phase={phase}
        mouseNdcRef={mouseNdcRef}
        reducedMotion={reducedMotion}
      >
        {children}
      </CubeBody>
      <CubeBody
        spec={CUBE_SPECS[1]}
        index={1}
        driversRef={drivers}
        side={side}
        phase={phase}
        mouseNdcRef={mouseNdcRef}
        reducedMotion={reducedMotion}
      >
        {children}
      </CubeBody>
    </>
  );
}

// ── Single cube body ──────────────────────────────────────────────

interface CubeBodyProps {
  spec: CubeSpec;
  /** 0 or 1 — slot in the shared drivers registry for the separation pass. */
  index: number;
  driversRef: RefObject<(ProjectStageDriver | null)[]>;
  side: ProjectSide;
  phase: ProjectPhase;
  mouseNdcRef: RefObject<MouseNdc>;
  reducedMotion: boolean;
  children: React.ReactNode;
}

function CubeBody({
  spec,
  index,
  driversRef,
  side,
  phase,
  mouseNdcRef,
  reducedMotion,
  children,
}: CubeBodyProps) {
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const [driver, setDriver] = useState<ProjectStageDriver | null>(null);

  useEffect(() => {
    if (!outerRef.current || !innerRef.current) return;
    const next = buildDriver(outerRef.current, innerRef.current, spec, side, reducedMotion);
    setDriver(next);
    driversRef.current[index] = next;
    return () => {
      driversRef.current[index] = null;
      next.bubbles.dispose();
      setDriver(null);
    };
  }, [spec, side, reducedMotion, index, driversRef]);

  usePhaseEdgeEffect(phase, driver);

  useFrame((state, delta) => {
    driver?.step(delta, mouseNdcRef.current, state.camera);
  });

  return (
    <>
      <group ref={outerRef} scale={MODEL_SCALE}>
        <group ref={innerRef}>
          <ProjectActiveProvider value={phase === "revealed"}>
            {children}
          </ProjectActiveProvider>
        </group>
      </group>
      {driver ? <BubbleField system={driver.bubbles} /> : null}
    </>
  );
}

// ── Driver factory ────────────────────────────────────────────────

function buildDriver(
  outer: THREE.Group,
  inner: THREE.Group,
  spec: CubeSpec,
  side: ProjectSide,
  reducedMotion: boolean,
): ProjectStageDriver {
  const sideSign = side === "left" ? 1 : -1;
  const rest: Vec3 = {
    x: (CLUSTER_CENTER_X + spec.restOffset.x) * sideSign,
    y: spec.restOffset.y,
    z: spec.restOffset.z,
  };
  const entrance: Vec3 = {
    x: rest.x,
    y: ENTRANCE_Y + spec.extraEntranceY,
    z: rest.z,
  };
  return new ProjectStageDriver({
    outer,
    inner,
    restPosition: rest,
    entrancePosition: entrance,
    restEulerPitch: spec.restPitch,
    restEulerYaw: spec.restYaw,
    restEulerRoll: spec.restRoll,
    entranceVelocity: { x: 0, y: spec.entranceVelY, z: 0 },
    entranceOmegaRange: spec.entranceOmegaRange,
    entranceDelaySec: spec.entranceDelaySec,
    body: BODY_CONFIG,
    mouse: MOUSE_CONFIG,
    exitGravity: EXIT_GRAVITY,
    exitDelaySec: spec.exitDelaySec,
    bubbleEmissionDuration: BUBBLE_EMISSION_DURATION,
    bubbleEmissionRate: BUBBLE_EMISSION_RATE,
    ambientAmp: spec.ambientAmp,
    ambientFreq: spec.ambientFreq,
    ambientPhase: spec.ambientPhase,
    reducedMotion,
  });
}

// ── Phase edge detection ──────────────────────────────────────────

function usePhaseEdgeEffect(
  phase: ProjectPhase,
  driver: ProjectStageDriver | null,
): void {
  const prevPhaseRef = useRef<ProjectPhase | null>(null);

  useEffect(() => {
    if (!driver) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev === null) {
      if (phase === "revealed") driver.enterScene();
      return;
    }
    if (prev !== "revealed" && phase === "revealed") driver.enterScene();
    else if (prev === "revealed" && phase !== "revealed") driver.exitScene();
  }, [phase, driver]);
}
