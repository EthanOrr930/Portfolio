"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RecorderDevice } from "./RecorderDevice";
import { LaptopModel } from "./LaptopModel";
import { LaptopScreen } from "./LaptopScreen";
import { CalloutDriver, type CalloutDom } from "./CalloutDriver";
import { LaptopLeaders } from "./LaptopLeaders";
import type { LeaderRef } from "./LaptopLeaderOverlay";
import { useRecorderInteraction } from "./useRecorderInteraction";
import { ROLL_REST_OFF } from "./TrackballRotationController";
import { HandoffChoreographer } from "./HandoffChoreographer";
import { stepSpring, type SpringConfig } from "../../motionTokens";
import { LAPTOP_SCALE, LAPTOP_REST_Y, LAPTOP_REST_Z } from "./laptopConstants";
import type { RecorderApi } from "./recorderApi";

const HERO_EULER = new THREE.Euler(-0.32, -0.52, 0); // cinematic landing angle (tilted down)
// Power-on read pose: a gentle 3/4 angle with a slight DOWN tilt (top visible),
// matching the reference framing — the device settles + holds here.
const FRONT_EULER = new THREE.Euler(-0.18, 0.2, 0);
// Underdamped spring → swings past the pose then springs back (pronounced overshoot).
const FRONT_SPRING = { stiffness: 110, damping: 6.5, mass: 1 };
const INTRO_DUR = 2.6; // spin-in duration (seconds)
const INTRO_TURNS = 1; // full rotations before landing
const INTRO_BELOW = 13; // start this far below the hero position
const READY_DELAY = 0; // fire "ready" as soon as the intro settles
// Underdamped → the device overshoots above center then settles (spring fly-up).
// Softer than default so it drifts up rather than shooting.
const INTRO_SPRING: SpringConfig = { stiffness: 48, damping: 7, mass: 1 };
// After spinning up centred, the device springs right (synced to the project
// copy sliding in on the left) — underdamped, so it overshoots the rest spot
// then slides back. Drives recorderGroup.x (inner), composing under exitGroup's
// handoff exit with no jump.
const SCOOTCH_X = 5.5;
const SCOOTCH_SPRING: SpringConfig = { stiffness: 80, damping: 10, mass: 1 };

/**
 * Scene orchestrator: the recorder spins in from below (overshooting spring +
 * ~10 decelerating rotations), the visitor runs the flow, then on DONE the
 * device accelerates off-left while the laptop slides in from the right,
 * overshoots, and settles — arming the dashboard. Owns the gesture gate and
 * ticks the handoff in one frame loop.
 */
interface RecorderShowcaseProps {
  dom: CalloutDom;
  laptopLeaders: LeaderRef[];
  /** Gate: the intro spin-in waits for this to flip true. Omit (harness) to
   *  fire on mount; the scroll section arms it the instant the city copy exits. */
  introArmRef?: React.RefObject<boolean>;
  /** Fired once the device has settled on stage (project copy floats in). */
  onRecorderReady?: () => void;
  /** Fired when the device→laptop handoff begins (project copy floats out). */
  onHandoffStart?: () => void;
}

export function RecorderShowcase({ dom, laptopLeaders, introArmRef, onRecorderReady, onHandoffStart }: RecorderShowcaseProps) {
  const recorderGroup = useRef<THREE.Group>(null);
  const exitGroup = useRef<THREE.Group>(null); // handoff exit: slide-left + half-spin
  const laptopGroup = useRef<THREE.Group>(null);
  const apiRef = useRef<RecorderApi | null>(null);
  const enabledRef = useRef(false); // gestures off until the intro spin settles
  const settledGateRef = useRef(false); // flips a beat after the intro settles
  const readyFired = useRef(false); // fire onRecorderReady once at settle
  const scootch = useRef({ x: 0, vel: 0 }); // scootch-aside spring, armed at settle
  const hero = useMemo(() => new THREE.Quaternion().setFromEuler(HERO_EULER), []);
  const front = useMemo(() => new THREE.Quaternion().setFromEuler(FRONT_EULER), []);
  const rot = useRecorderInteraction({ groupRef: recorderGroup, apiRef, enabledRef });
  const choreo = useMemo(() => new HandoffChoreographer(), []);
  const intro = useRef({ t: 0, y: -INTRO_BELOW, vel: 0, gesturesOn: false });
  const started = useRef(false); // intro spin fired (gated by introArmRef)
  const dashLiveRef = useRef(false);
  const [dashLive, setDashLive] = useState(false);

  // Drop the whole stage back to its pre-intro state so a replayed section
  // (scroll back above, then down again) spins the device in fresh.
  const resetShowcase = useCallback(() => {
    started.current = false;
    intro.current = { t: 0, y: -INTRO_BELOW, vel: 0, gesturesOn: false };
    scootch.current = { x: 0, vel: 0 };
    enabledRef.current = false;
    settledGateRef.current = false;
    readyFired.current = false;
    choreo.reset();
    rot.setOrientation(hero);
    recorderGroup.current?.position.set(0, -INTRO_BELOW, 0);
    exitGroup.current?.position.set(0, 0, 0);
    exitGroup.current?.rotation.set(0, 0, 0);
    laptopGroup.current?.position.set(choreo.laptopStartX, LAPTOP_REST_Y, LAPTOP_REST_Z);
    laptopGroup.current?.rotation.set(0, 0, 0);
    dashLiveRef.current = false;
    setDashLive(false);
  }, [choreo, rot, hero]);

  // Power on → roll the device front-on for reading (overshoots, then settles).
  // The snapback stays wide so it won't auto-level before you grab it; it
  // tightens on the first drag (in the controller) so releases snap level.
  const rollFrontOn = useCallback(() => {
    rot.settleSpring(front, FRONT_SPRING);
  }, [rot, front]);

  // Power off → loosen the snapback again (won't auto-level the resting angle).
  const onPowerOff = useCallback(() => {
    rot.setRollDeadzone(ROLL_REST_OFF);
  }, [rot]);

  const startHandoff = useCallback(() => {
    enabledRef.current = false; // kill gestures + callouts instantly
    onHandoffStart?.(); // float the project copy back out
    choreo.start();
  }, [choreo, onHandoffStart]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const armed = introArmRef ? introArmRef.current : true;
    if (!armed) {
      if (started.current) resetShowcase(); // scrolled back above → replay later
      return; // device waits below frame until armed
    }
    if (!started.current) {
      started.current = true;
      rot.introSpin(hero, INTRO_TURNS, INTRO_DUR); // fire the spin-in now
    }
    tickIntro(intro.current, recorderGroup.current, enabledRef, settledGateRef, dt);
    if (settledGateRef.current && !readyFired.current) {
      readyFired.current = true;
      onRecorderReady?.(); // device settled → float the project copy in
    }
    if (readyFired.current && !choreo.isRunning && recorderGroup.current) {
      const sp = stepSpring(scootch.current.x, scootch.current.vel, SCOOTCH_X, SCOOTCH_SPRING, dt);
      scootch.current.x = sp.value;
      scootch.current.vel = sp.velocity;
      recorderGroup.current.position.x = sp.value;
    }
    if (choreo.isRunning) tickHandoff(choreo, exitGroup.current, laptopGroup.current, dt, arm);
  });

  function arm() {
    if (dashLiveRef.current) return;
    dashLiveRef.current = true;
    setDashLive(true);
  }

  return (
    <>
      <group ref={exitGroup}>
        <group ref={recorderGroup} position={[0, -INTRO_BELOW, 0]}>
          <RecorderDevice apiRef={apiRef} onDone={startHandoff} onPowerOn={rollFrontOn} onPowerOff={onPowerOff} />
        </group>
      </group>
      <group ref={laptopGroup} position={[choreo.laptopStartX, LAPTOP_REST_Y, LAPTOP_REST_Z]}>
        <LaptopModel scale={LAPTOP_SCALE}>
          <LaptopScreen live={dashLive} />
        </LaptopModel>
      </group>
      <CalloutDriver apiRef={apiRef} deviceRef={recorderGroup} dom={dom} gateRef={settledGateRef} />
      <LaptopLeaders live={dashLive} leaders={laptopLeaders} />
    </>
  );
}

interface IntroState {
  t: number;
  y: number;
  vel: number;
  gesturesOn: boolean;
}

/** Fly-up spring on Y, enable gestures at settle, then flip the ready gate. */
function tickIntro(
  it: IntroState,
  group: THREE.Group | null,
  enabledRef: React.RefObject<boolean>,
  settledGateRef: React.RefObject<boolean>,
  dt: number,
): void {
  if (it.t >= INTRO_DUR + READY_DELAY + 0.1) return; // fully armed — stop driving
  it.t += dt;
  if (it.t < INTRO_DUR + 1) {
    const s = stepSpring(it.y, it.vel, 0, INTRO_SPRING, dt);
    it.y = s.value;
    it.vel = s.velocity;
    if (group) group.position.y = it.y;
  }
  if (!it.gesturesOn && it.t >= INTRO_DUR) {
    it.gesturesOn = true;
    enabledRef.current = true;
  }
  if (it.t >= INTRO_DUR + READY_DELAY) settledGateRef.current = true;
}

/** Slide the device off-left and the laptop in from the right; arm on settle. */
function tickHandoff(
  choreo: HandoffChoreographer,
  recorder: THREE.Group | null,
  laptop: THREE.Group | null,
  dt: number,
  onLive: () => void,
): void {
  const h = choreo.update(dt);
  if (recorder) {
    recorder.position.x = h.devX;
    recorder.rotation.y = h.devRotY; // half-spin on the way out
  }
  if (laptop) {
    laptop.position.x = h.lapX;
    laptop.position.z = LAPTOP_REST_Z + h.lapZ; // dolly from far → rest
    laptop.rotation.y = h.lapRotY;
  }
  if (h.dashboardLive) onLive();
}
