"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RecorderModel } from "./RecorderModel";
import { PowerSwitch } from "./PowerSwitch";
import { RecorderStateMachine } from "./RecorderStateMachine";
import { OledScreenRenderer } from "./OledScreenRenderer";
import { LedStripController } from "./LedStripController";
import { SCREEN_ANCHOR, LED_SLIT, LED_COUNT, SWITCH_ANCHOR } from "./recorderConstants";
import type { RecorderApi } from "./recorderApi";

const SESSIONS = ["Future of Astronomy", "Panel Discussion", "Closing Remarks"];

interface RecorderDeviceProps {
  apiRef: React.RefObject<RecorderApi | null>;
  vuRef?: React.RefObject<Float32Array>;
  deviceName?: string;
  onDone?: () => void; // fired once the recording flow reaches DONE (kicks the handoff)
  onPowerOn?: () => void; // fired when the device is switched on (rolls it front-on)
  onPowerOff?: () => void; // fired when the device is switched off
}

/**
 * Assembles the recorder (model + emissive OLED + recessed LED slit + power
 * switch) and drives it each frame from the state machine. Owns power +
 * session state and exposes a RecorderApi for the interaction layer.
 */
export function RecorderDevice({
  apiRef,
  vuRef,
  deviceName = "BALLROOM A",
  onDone,
  onPowerOn,
  onPowerOff,
}: RecorderDeviceProps) {
  const sm = useMemo(() => new RecorderStateMachine(), []);
  const oled = useMemo(() => new OledScreenRenderer(), []);
  const leds = useMemo(() => new LedStripController(), []);
  const ledMats = useMemo(() => makeLedMaterials(), []);
  const ledLights = useMemo(
    () => Array.from({ length: LED_COUNT }, () => new THREE.PointLight("#39c8c0", 0, 4.5, 2.2)),
    [],
  );
  const screenRef = useRef<THREE.Mesh>(null);
  const switchAnchorRef = useRef<THREE.Group>(null);
  const scroll = useRef(0);
  const fallbackVu = useMemo(() => new Float32Array(8), []);

  const [powered, setPowered] = useState(false); // starts OFF — tutorial turns it on
  const [sessionIdx, setSessionIdx] = useState(0);
  const poweredRef = useRef(powered);
  poweredRef.current = powered;

  useEffect(() => {
    leds.setMaterials(ledMats);
    leds.setLights(ledLights);
    apiRef.current = {
      sm,
      cycleSession: () => {
        if (poweredRef.current && sm.state === "STANDBY") {
          setSessionIdx((i) => (i + 1) % SESSIONS.length);
        }
      },
      togglePower: () => setPowered((p) => !p),
      isPowered: () => poweredRef.current,
      getScreenMesh: () => screenRef.current,
      getSwitchAnchor: () => switchAnchorRef.current,
    };
    return () => oled.dispose();
  }, [apiRef, leds, ledMats, ledLights, sm, oled]);

  // Power on → boot splash → standby. Power off → abort recording (must restart).
  useEffect(() => {
    if (powered) {
      sm.powerOn();
      onPowerOn?.(); // roll the device front-on for reading
    } else {
      sm.powerOff();
      onPowerOff?.();
    }
  }, [powered, sm, onPowerOn, onPowerOff]);

  // DONE → hand off to the laptop view (fires once on the transition into DONE).
  useEffect(() => {
    sm.onStateChange = (_prev, next) => {
      if (next === "DONE") onDone?.();
    };
    return () => {
      sm.onStateChange = undefined;
    };
  }, [sm, onDone]);

  useFrame((state, dt) => {
    const clock = state.clock.elapsedTime;
    if (powered) sm.update(dt);
    const vu = vuRef?.current ?? fillSineVu(fallbackVu, clock, sm.state, powered);
    scroll.current =
      powered && sm.state === "RECORDING" ? (scroll.current + dt * 26) % 220 : 0;
    oled.render({
      state: sm.state,
      holdProgress: sm.holdProgress,
      elapsedSec: sm.elapsedSec,
      timeLeftSec: sm.timeLeftSec,
      vu,
      title: SESSIONS[sessionIdx],
      deviceName,
      sessionLabel: `< ${sessionIdx + 1}/${SESSIONS.length} >`,
      blinkOn: Math.floor(clock * 2) % 2 === 0,
      scrollPx: scroll.current,
      powered,
      clock,
    });
    if (powered) leds.update(sm.state, sm.holdProgress, sm.timeLeftFrac, clock);
    else leds.setOff();
  });

  return (
    <RecorderModel>
      <mesh ref={screenRef} position={SCREEN_ANCHOR.pos}>
        <planeGeometry args={[SCREEN_ANCHOR.width, SCREEN_ANCHOR.height]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#ffffff"
          emissiveMap={oled.texture}
          emissiveIntensity={1.9}
          roughness={0.3}
          toneMapped={false}
        />
      </mesh>
      <LedSlit ledMats={ledMats} lights={ledLights} />
      <PowerSwitch on={powered} onToggle={() => setPowered((p) => !p)} />
      <group
        ref={switchAnchorRef}
        position={[SWITCH_ANCHOR.pos[0] + 6, SWITCH_ANCHOR.pos[1], SWITCH_ANCHOR.pos[2]]}
      />
    </RecorderModel>
  );
}

/** LEDs recessed inside the case on a dark interior wall, with a point light
 *  per LED. Their glow + spill light shine out through the real slit in the
 *  face; bloom bleeds it along the opening. */
function LedSlit({
  ledMats,
  lights,
}: {
  ledMats: THREE.MeshStandardMaterial[];
  lights: THREE.PointLight[];
}) {
  return (
    <group>
      {/* dark interior wall behind the LEDs */}
      <mesh position={[0, LED_SLIT.y, LED_SLIT.bandZ]}>
        <boxGeometry args={[LED_SLIT.bandWidth, 6, 0.5]} />
        <meshStandardMaterial color="#070809" roughness={0.95} />
      </mesh>
      {ledMats.map((mat, i) => {
        const x = LED_SLIT.startX + i * LED_SLIT.pitch;
        return (
          <group key={i}>
            <mesh position={[x, LED_SLIT.y, LED_SLIT.z]} material={mat}>
              <boxGeometry args={[LED_SLIT.size, LED_SLIT.size, 0.4]} />
            </mesh>
            <primitive object={lights[i]} position={[x, LED_SLIT.y, LED_SLIT.lightZ]} />
          </group>
        );
      })}
    </group>
  );
}

function makeLedMaterials(): THREE.MeshStandardMaterial[] {
  return Array.from(
    { length: LED_COUNT },
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a0c0f",
        emissive: "#39c8c0",
        emissiveIntensity: 0.1,
        roughness: 0.4,
        toneMapped: false,
      }),
  );
}

/** Demo VU when no audio analyser is wired. */
function fillSineVu(out: Float32Array, clock: number, state: string, powered: boolean): Float32Array {
  const active = powered && state === "RECORDING";
  for (let i = 0; i < out.length; i++) {
    out[i] = active ? 0.3 + 0.5 * Math.abs(Math.sin(clock * 3 + i * 0.7)) : 0;
  }
  return out;
}
