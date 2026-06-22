"use client";

// TEMP dev harness (owner: ethan, 2026-06) — laptop + dashboard screen, with a
// TransformControls gizmo on the screen group. The readout (top-left) shows the
// group's LOCAL position / rotation° / scale — exactly the values to bake into
// SCREEN_QUAD. Press 1/2/3 (or the buttons) to switch move / rotate / scale.

import { Suspense, useCallback, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { LaptopModel } from "@/components/scroll-experience/projects/recorder/LaptopModel";
import { LaptopScreen } from "@/components/scroll-experience/projects/recorder/LaptopScreen";

const SKY = "#f4efe7";
type Mode = "translate" | "rotate" | "scale";

interface Readout {
  pos: React.RefObject<HTMLSpanElement | null>;
  rot: React.RefObject<HTMLSpanElement | null>;
  scale: React.RefObject<HTMLSpanElement | null>;
}

export default function LaptopTestPage() {
  const [mode, setMode] = useState<Mode>("translate");
  const readout: Readout = {
    pos: useRef(null),
    rot: useRef(null),
    scale: useRef(null),
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: SKY }}>
      <Canvas
        camera={{ position: [3.5, 2, 4.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <hemisphereLight args={["#fbf7f0", "#8b8377", 1.0]} />
        <directionalLight position={[5, 8, 6]} intensity={1.8} color="#fff6e8" />
        <directionalLight position={[-6, 3, -4]} intensity={0.5} color="#cfd6e0" />
        <axesHelper args={[3]} />
        <Suspense fallback={null}>
          <ScreenGizmo mode={mode} readout={readout} />
        </Suspense>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
      <TransformPanel mode={mode} setMode={setMode} readout={readout} />
    </div>
  );
}

/** Laptop + screen with the gizmo bound to the screen group; streams the local
 *  transform into the readout each frame. */
function ScreenGizmo({ mode, readout }: { mode: Mode; readout: Readout }) {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const bind = useCallback((g: THREE.Group | null) => setGroup(g), []);
  useFrame(() => writeReadout(group, readout));
  return (
    <>
      <LaptopModel>
        {/* live=false so the dashboard doesn't capture the pointer while you
            orbit / drag the gizmo */}
        <LaptopScreen ref={bind} live={false} />
      </LaptopModel>
      {group && <TransformControls object={group} mode={mode} />}
    </>
  );
}

function writeReadout(g: THREE.Group | null, r: Readout): void {
  if (!g) return;
  const p = g.position;
  const e = g.rotation;
  const s = g.scale;
  const deg = (rad: number) => ((rad * 180) / Math.PI).toFixed(1);
  if (r.pos.current) r.pos.current.textContent = `[${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]`;
  if (r.rot.current) r.rot.current.textContent = `[${deg(e.x)}°, ${deg(e.y)}°, ${deg(e.z)}°]  (rad [${e.x.toFixed(3)}, ${e.y.toFixed(3)}, ${e.z.toFixed(3)}])`;
  if (r.scale.current) r.scale.current.textContent = `${s.x.toFixed(3)} (x${s.x.toFixed(2)}, y${s.y.toFixed(2)}, z${s.z.toFixed(2)})`;
}

/** Fixed overlay: live transform readout + mode buttons. */
function TransformPanel({
  mode,
  setMode,
  readout,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  readout: Readout;
}) {
  const modes: Mode[] = ["translate", "rotate", "scale"];
  return (
    <div style={panelStyle}>
      <Row label="pos" valueRef={readout.pos} />
      <Row label="rot" valueRef={readout.rot} />
      <Row label="scale" valueRef={readout.scale} />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{ ...btnStyle, background: mode === m ? "#1c1c1f" : "#fff", color: mode === m ? "#fff" : "#1c1c1f" }}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ label, valueRef }: { label: string; valueRef: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ opacity: 0.55, width: 44 }}>{label}</span>
      <span ref={valueRef} />
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  left: 16,
  padding: "12px 14px",
  borderRadius: 8,
  background: "rgba(244,239,231,0.92)",
  backdropFilter: "blur(3px)",
  fontFamily: "ui-monospace, monospace",
  fontSize: 12.5,
  lineHeight: 1.7,
  color: "#1c1c1f",
  boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
};

const btnStyle: React.CSSProperties = {
  border: "1px solid #1c1c1f",
  borderRadius: 5,
  padding: "3px 9px",
  fontSize: 11.5,
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};
