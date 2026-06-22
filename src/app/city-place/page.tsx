"use client";

// TEMP dev harness (owner: ethan, 2026-06) — place the voxel character + gun
// in the city with transform gizmos, free camera, live transforms, and a
// muzzle anchor. Copy the transforms, then bake them into the scene.

import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { StreetCity } from "@/components/scroll-experience/projects/city/StreetCity";
import { VoxelModel } from "@/components/voxel/VoxelModel";

const SKY = "#f4efe7";
const MODEL_SCALE = 0.2;

type Sel = "char" | "gun";

export default function CityPlacePage() {
  const [charObj, setCharObj] = useState<THREE.Object3D | null>(null);
  const [gunObj, setGunObj] = useState<THREE.Object3D | null>(null);
  const muzzleRef = useRef<THREE.Object3D>(null);
  const [sel, setSel] = useState<Sel>("char");
  const [mode, setMode] = useState<"translate" | "rotate">("translate");
  const hudRef = useRef<HTMLPreElement>(null);
  const snapRef = useRef("");

  const selected = sel === "char" ? charObj : gunObj;

  const copy = () => navigator.clipboard?.writeText(snapRef.current);

  return (
    <div style={{ position: "fixed", inset: 0, background: SKY }}>
      <Canvas
        camera={{ position: [-20, 18, 30], fov: 42, far: 6000 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <fog attach="fog" args={[SKY, 60, 260]} />
        <hemisphereLight args={["#f3eee4", "#6f6c66", 1.1]} />
        <directionalLight position={[-60, 90, 50]} intensity={1.6} color="#fff6e8" />
        <directionalLight position={[60, 50, -30]} intensity={0.4} color="#cfd6e0" />

        <Ground />
        <ModelBoundary>
          <Suspense fallback={null}>
            <StreetCity />
          </Suspense>
        </ModelBoundary>

        <VoxelModel
          ref={setCharObj}
          url="/models/voxel-character.json"
          scale={MODEL_SCALE}
          position={[-16, 0, 2]}
        />
        <VoxelModel
          ref={setGunObj}
          url="/models/voxel-gun.json"
          scale={MODEL_SCALE}
          position={[-14, 3, 3]}
          muzzleAnchorRef={muzzleRef}
          showMuzzleMarker
        />

        {selected && (
          <TransformControls object={selected} mode={mode} size={0.8} />
        )}
        <OrbitControls makeDefault />
        <CameraFly />
        <Readout
          target={selected}
          muzzleRef={muzzleRef}
          hudRef={hudRef}
          snapRef={snapRef}
          sel={sel}
        />
      </Canvas>

      <Hud
        sel={sel}
        onSel={setSel}
        mode={mode}
        onMode={setMode}
        hudRef={hudRef}
        onCopy={copy}
      />
    </div>
  );
}

/** WASD to move on the ground plane, Q/E up/down, Shift = faster. Moves the
 *  camera AND its orbit target together so orbit-look still works after. */
function CameraFly() {
  const { camera, controls } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const dn = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);
  useFrame((_, dt) => {
    const k = keys.current;
    const s = 24 * dt * (k["ShiftLeft"] || k["ShiftRight"] ? 3 : 1);
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize(); // level forward (ignore pitch)
    const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
    const move = new THREE.Vector3();
    if (k["KeyW"]) move.addScaledVector(fwd, s);
    if (k["KeyS"]) move.addScaledVector(fwd, -s);
    if (k["KeyD"]) move.addScaledVector(right, s);
    if (k["KeyA"]) move.addScaledVector(right, -s);
    if (k["KeyE"]) move.y += s;
    if (k["KeyQ"]) move.y -= s;
    if (move.lengthSq() === 0) return;
    camera.position.add(move);
    const t = controls as unknown as { target?: THREE.Vector3 } | null;
    if (t?.target) t.target.add(move);
  });
  return null;
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -120]} receiveShadow>
      <planeGeometry args={[800, 800]} />
      <meshStandardMaterial color="#cfcabf" roughness={1} metalness={0} />
    </mesh>
  );
}

const fmt = (n: number) => n.toFixed(2);

/** Writes the selected object's transform + muzzle world pos + camera into the
 *  HUD each frame, and stamps a paste-ready snippet. */
function Readout({
  target,
  muzzleRef,
  hudRef,
  snapRef,
  sel,
}: {
  target: THREE.Object3D | null;
  muzzleRef: React.RefObject<THREE.Object3D | null>;
  hudRef: React.RefObject<HTMLPreElement | null>;
  snapRef: React.RefObject<string>;
  sel: Sel;
}) {
  useFrame(({ camera }) => {
    const lines: string[] = [];
    if (target) {
      const p = target.position;
      const r = target.rotation;
      lines.push(`${sel}  pos [${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)}]`);
      lines.push(`     rot [${fmt(r.x)}, ${fmt(r.y)}, ${fmt(r.z)}]`);
      snapRef.current =
        `position={[${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)}]} ` +
        `rotation={[${fmt(r.x)}, ${fmt(r.y)}, ${fmt(r.z)}]}`;
    }
    const muzzle = muzzleRef.current;
    if (muzzle) {
      const w = muzzle.getWorldPosition(new THREE.Vector3());
      lines.push(`muzzle [${fmt(w.x)}, ${fmt(w.y)}, ${fmt(w.z)}]`);
    }
    const c = camera.position;
    lines.push(`cam  [${fmt(c.x)}, ${fmt(c.y)}, ${fmt(c.z)}]`);
    if (hudRef.current) hudRef.current.textContent = lines.join("\n");
  });
  return null;
}

interface HudProps {
  sel: Sel;
  onSel: (s: Sel) => void;
  mode: "translate" | "rotate";
  onMode: (m: "translate" | "rotate") => void;
  hudRef: React.RefObject<HTMLPreElement | null>;
  onCopy: () => void;
}

function Hud({ sel, onSel, mode, onMode, hudRef, onCopy }: HudProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        padding: 12,
        width: 240,
        background: "rgba(18,18,22,0.88)",
        color: "#e8e8ee",
        font: "12px/1.5 ui-monospace, monospace",
        borderRadius: 10,
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onSel("char")} style={tab(sel === "char")}>
          Character
        </button>
        <button onClick={() => onSel("gun")} style={tab(sel === "gun")}>
          Gun
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={() => onMode("translate")} style={tab(mode === "translate")}>
          Move (T)
        </button>
        <button onClick={() => onMode("rotate")} style={tab(mode === "rotate")}>
          Rotate (R)
        </button>
      </div>
      <pre ref={hudRef} style={{ margin: "10px 0 0", whiteSpace: "pre" }}>
        …
      </pre>
      <button
        onClick={onCopy}
        style={{
          marginTop: 8,
          width: "100%",
          padding: "6px 0",
          background: "#3a6ea5",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          font: "12px ui-monospace, monospace",
        }}
      >
        Copy selected transform
      </button>
      <div style={{ marginTop: 6, color: "#777" }}>
        drag gizmo to place · orbit to look
      </div>
    </div>
  );
}

function tab(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "5px 0",
    background: active ? "#4a7a3a" : "#2a2a32",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    font: "12px ui-monospace, monospace",
  };
}

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
