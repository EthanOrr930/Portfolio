"use client";

// Voxel editor for authoring the Project-2 character. Click a block face to
// add a voxel (current color), or erase. Autosaves to localStorage (static
// export = no server); use "Download .json" to update the model file at
// public/models/voxel-character.json.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { VoxelMesh } from "@/components/voxel/VoxelMesh";
import { voxelKey, type Voxel } from "@/lib/voxel/types";

// Switchable models via ?model= (character | gun).
const MODELS = {
  character: { url: "/models/voxel-character.json", key: "voxel-character", file: "voxel-character.json", label: "CHARACTER" },
  gun: { url: "/models/voxel-gun.json", key: "voxel-gun", file: "voxel-gun.json", label: "GUN" },
} as const;
type ModelId = keyof typeof MODELS;

function readModelId(): ModelId {
  if (typeof window === "undefined") return "character";
  return new URLSearchParams(window.location.search).get("model") === "gun"
    ? "gun"
    : "character";
}

const PALETTE = [
  "#d8a878", "#6b4a2b", "#553a22", "#15151a", "#4f8a3f",
  "#e6d24a", "#2b315e", "#bfe3ef", "#8ef0ff", "#2c3e50",
  "#8a8f99", "#ffffff",
];

export default function VoxelEditorPage() {
  const cfg = useMemo(() => MODELS[readModelId()], []);
  const [voxels, setVoxels] = useState<Voxel[]>([]);
  const [color, setColor] = useState(PALETTE[0]);
  const [erase, setErase] = useState(false);
  const [saved, setSaved] = useState(true);
  const loaded = useRef(false);
  // Distinguish a click from an orbit/pan drag so dragging doesn't place.
  const drag = useRef({ x: 0, y: 0, moved: false });

  useEffect(() => {
    const dn = (e: PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY, moved: false };
    };
    const mv = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > 5)
        drag.current.moved = true;
    };
    window.addEventListener("pointerdown", dn);
    window.addEventListener("pointermove", mv);
    return () => {
      window.removeEventListener("pointerdown", dn);
      window.removeEventListener("pointermove", mv);
    };
  }, []);

  // Load the committed model file (authoritative). localStorage is only for
  // autosave/Download backup — use "load from file" never needed on reload now.
  useEffect(() => {
    fetch(cfg.url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setVoxels(Array.isArray(d.voxels) ? d.voxels : []))
      .catch(() => setVoxels([]))
      .finally(() => {
        loaded.current = true;
      });
  }, [cfg]);

  // Autosave to localStorage (debounced).
  useEffect(() => {
    if (!loaded.current) return;
    setSaved(false);
    const t = setTimeout(() => {
      localStorage.setItem(cfg.key, JSON.stringify({ voxels }));
      setSaved(true);
    }, 350);
    return () => clearTimeout(t);
  }, [voxels, cfg]);

  const occupied = useMemo(
    () => new Set(voxels.map((v) => voxelKey(v.x, v.y, v.z))),
    [voxels],
  );

  const addAt = (x: number, y: number, z: number) => {
    if (occupied.has(voxelKey(x, y, z))) return;
    setVoxels((vs) => [...vs, { x, y, z, color }]);
  };

  const onPick = (i: number, e: ThreeEvent<MouseEvent>) => {
    if (drag.current.moved) return;
    if (erase || e.altKey) {
      setVoxels((vs) => vs.filter((_, idx) => idx !== i));
      return;
    }
    const v = voxels[i];
    if (!v) return;
    // Pick the face from the hit point relative to the voxel centre (robust —
    // doesn't depend on the instanced face normal).
    const dx = e.point.x - v.x;
    const dy = e.point.y - v.y;
    const dz = e.point.z - v.z;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const az = Math.abs(dz);
    let nx = 0;
    let ny = 0;
    let nz = 0;
    if (ax >= ay && ax >= az) nx = Math.sign(dx);
    else if (ay >= az) ny = Math.sign(dy);
    else nz = Math.sign(dz);
    addAt(v.x + nx, v.y + ny, v.z + nz);
  };

  const onGround = (e: ThreeEvent<MouseEvent>) => {
    if (drag.current.moved || erase) return;
    e.stopPropagation();
    addAt(Math.round(e.point.x), 0, Math.round(e.point.z));
  };

  const reloadFromFile = () => {
    fetch(cfg.url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setVoxels(Array.isArray(d.voxels) ? d.voxels : []));
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result));
        if (Array.isArray(d.voxels)) setVoxels(d.voxels);
      } catch {
        /* ignore bad file */
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-picking the same file
  };

  const download = () => {
    const blob = new Blob([JSON.stringify({ voxels })], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = cfg.file;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#26262c" }}>
      <Canvas camera={{ position: [34, 30, 34], fov: 40 }} dpr={[1, 1.5]}>
        <hemisphereLight args={["#ffffff", "#3a3a44", 1.0]} />
        <directionalLight position={[18, 30, 12]} intensity={1.4} />
        <gridHelper args={[60, 60, "#4a4a55", "#34343c"]} position={[0, -0.5, 0]} />
        {/* Transparent (not invisible) so the raycaster still hits it for
            ground placement; voxel clicks are closer and win via stopProp. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} onClick={onGround}>
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <VoxelMesh voxels={voxels} onPick={onPick} />
        <OrbitControls makeDefault target={[5, 20, 3]} />
      </Canvas>

      <Toolbar
        palette={PALETTE}
        color={color}
        onColor={setColor}
        erase={erase}
        onErase={setErase}
        saved={saved}
        count={voxels.length}
        onClear={() => setVoxels([])}
        onDownload={download}
        onReloadFile={reloadFromFile}
        onUpload={onUpload}
      />
    </div>
  );
}

interface ToolbarProps {
  palette: string[];
  color: string;
  onColor: (c: string) => void;
  erase: boolean;
  onErase: (e: boolean) => void;
  saved: boolean;
  count: number;
  onClear: () => void;
  onDownload: () => void;
  onReloadFile: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Toolbar(props: ToolbarProps) {
  const { palette, color, onColor, erase, onErase, saved, count } = props;
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        padding: 12,
        width: 210,
        background: "rgba(18,18,22,0.9)",
        color: "#e8e8ee",
        font: "12px/1.5 ui-monospace, monospace",
        borderRadius: 10,
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {palette.map((c) => (
          <button
            key={c}
            onClick={() => {
              onColor(c);
              onErase(false);
            }}
            title={c}
            style={{
              width: 26,
              height: 26,
              background: c,
              border: c === color && !erase ? "2px solid #fff" : "1px solid #000",
              borderRadius: 5,
              cursor: "pointer",
            }}
          />
        ))}
      </div>
      <input
        type="color"
        value={color}
        onChange={(e) => onColor(e.target.value)}
        style={{ marginTop: 8, width: "100%", height: 26, cursor: "pointer" }}
      />
      <button onClick={() => onErase(!erase)} style={btn(erase ? "#c0563b" : "#34343c")}>
        {erase ? "Erase: ON" : "Erase: off"} (Alt-click)
      </button>
      <div style={{ marginTop: 10, color: "#9a9aa6" }}>
        {count} voxels · {saved ? "saved" : "saving…"}
      </div>
      <div style={{ marginTop: 4, color: "#6f6f7a" }}>
        click face = add · drag = orbit
      </div>
      <button onClick={props.onDownload} style={btn("#3a6ea5")}>
        Download .json
      </button>
      <button onClick={props.onReloadFile} style={btn("transparent", "#9a9aa6")}>
        reset to committed file
      </button>
      <label style={{ ...btn("#4a7a3a"), display: "block", textAlign: "center" }}>
        Upload .json
        <input
          type="file"
          accept="application/json,.json"
          onChange={props.onUpload}
          style={{ display: "none" }}
        />
      </label>
      <button onClick={props.onClear} style={btn("transparent", "#9a9aa6")}>
        clear all
      </button>
    </div>
  );
}

function btn(bg: string, color = "#fff"): React.CSSProperties {
  return {
    marginTop: 8,
    width: "100%",
    padding: "6px 0",
    background: bg,
    color,
    border: bg === "transparent" ? "1px solid #44444e" : "none",
    borderRadius: 6,
    cursor: "pointer",
    font: "12px ui-monospace, monospace",
  };
}
