"use client";

import { useRef, useState } from "react";
import * as THREE from "three";

const BUILT_IN_EXRS = [
  { label: "Brain", path: "textures/positions.exr" },
];

/** Use a Three.js Camera to compute the exact euler rotation that looks from `pos` at the origin. */
const _lookAtCam = new THREE.PerspectiveCamera();
function lookAtRotation(pos: [number, number, number]): [number, number, number] {
  _lookAtCam.position.set(...pos);
  _lookAtCam.lookAt(0, 0, 0);
  return [
    Math.round(_lookAtCam.rotation.x * 10000) / 10000,
    Math.round(_lookAtCam.rotation.y * 10000) / 10000,
    Math.round(_lookAtCam.rotation.z * 10000) / 10000,
  ];
}

interface ExtractedMeta {
  camera: {
    position: [number, number, number];
    rotation: [number, number, number];
    fov: number;
  };
  modelRotation: [number, number, number];
}

/** Extract camera + model metadata from a companion JSON object. */
function extractMetaFromJSON(meta: Record<string, number>): ExtractedMeta | null {
  if (meta.cameraX === undefined) return null;
  const pos: [number, number, number] = [meta.cameraX ?? 0, meta.cameraY ?? 0, meta.cameraZ ?? 2.8];
  const rot: [number, number, number] = meta.cameraRotationX !== undefined
    ? [meta.cameraRotationX, meta.cameraRotationY ?? 0, meta.cameraRotationZ ?? 0]
    : lookAtRotation(pos);
  const modelRot: [number, number, number] = meta.modelRotationX !== undefined
    ? [meta.modelRotationX, meta.modelRotationY ?? 0, meta.modelRotationZ ?? 0]
    : [0, 0, 0];
  return {
    camera: { position: pos, rotation: rot, fov: meta.cameraFov ?? 50 },
    modelRotation: modelRot,
  };
}

interface CameraData {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
}

interface EXRPickerProps {
  value: string;
  onChange: (path: string) => void;
  camera: CameraData;
  onCameraChange: (camera: CameraData) => void;
  /** Atomic update: set path + camera + modelRotation in one state update */
  onImportComplete?: (data: { path: string; camera: CameraData; modelRotation: [number, number, number] }) => void;
}

export function EXRPicker({
  value,
  onChange,
  camera,
  onCameraChange,
  onImportComplete,
}: EXRPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      // Separate EXR and JSON files
      let exrFile: File | null = null;
      let jsonFile: File | null = null;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.name.toLowerCase().endsWith(".exr")) exrFile = f;
        if (f.name.toLowerCase().endsWith(".json")) jsonFile = f;
      }

      if (!exrFile) {
        console.error("No .exr file selected");
        return;
      }

      // Upload the EXR
      const buffer = await exrFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
      );

      const filename = exrFile.name.toLowerCase().replace(/\s+/g, "-");
      const path = `textures/${filename}`;

      const resp = await fetch("/api/write-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: base64, encoding: "base64" }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Upload failed");
      }

      // Read companion JSON content (from local file or server)
      let meta: Record<string, number> | null = null;

      if (jsonFile) {
        const jsonContent = await jsonFile.text();
        try {
          meta = JSON.parse(jsonContent);
        } catch { /* ignore parse errors */ }

        // Also upload it to server
        const jsonFilename = jsonFile.name.toLowerCase().replace(/\s+/g, "-");
        const jsonPath = `textures/${jsonFilename}`;
        await fetch("/api/write-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: jsonPath, content: jsonContent, encoding: "utf8" }),
        });
      } else {
        // Try fetching companion JSON that may already exist on server
        const jsonName = filename.replace(/\.exr$/, ".json");
        const jsonPath = `textures/${jsonName}`;
        try {
          const jsonResp = await fetch(`/${jsonPath}`);
          if (jsonResp.ok) {
            meta = await jsonResp.json();
          }
        } catch { /* no companion JSON */ }
      }

      // Apply path + camera + rotation in one atomic update to avoid stale closure issues
      if (meta && onImportComplete) {
        const extracted = extractMetaFromJSON(meta);
        if (extracted) {
          onImportComplete({ path, camera: extracted.camera, modelRotation: extracted.modelRotation });
        } else {
          onChange(path);
        }
      } else {
        onChange(path);
      }
    } catch (e) {
      console.error("EXR upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  // Also check for companion JSON when selecting a built-in EXR
  const handleSelect = async (path: string) => {
    try {
      const jsonPath = path.replace(/\.exr$/, ".json");
      const resp = await fetch(`/${jsonPath}`);
      if (resp.ok) {
        const meta = await resp.json();
        const extracted = extractMetaFromJSON(meta);
        if (extracted && onImportComplete) {
          onImportComplete({ path, camera: extracted.camera, modelRotation: extracted.modelRotation });
          return;
        }
      }
    } catch {
      // No companion JSON
    }
    onChange(path);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
        Particle Shape
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {BUILT_IN_EXRS.map((exr) => (
          <button
            key={exr.path}
            onClick={() => handleSelect(exr.path)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              value === exr.path
                ? "bg-zinc-200 text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {exr.label}
          </button>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-2.5 py-1 text-xs font-mono rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload .exr"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".exr,.json"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) handleUpload(files);
          // Reset so re-uploading the same file triggers onChange
          e.target.value = "";
        }}
      />
      <p className="text-[10px] font-mono text-zinc-400 truncate">{value?.split("?")[0]}</p>

      {/* Camera position */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-200">
        <span className="text-[10px] font-mono text-zinc-500">Camera Position</span>
        <div className="grid grid-cols-3 gap-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <label key={axis} className="block">
              <span className="text-[9px] font-mono text-zinc-400 uppercase">{axis}</span>
              <input
                type="number"
                step={0.1}
                value={camera.position[i]}
                onChange={(e) => {
                  const pos = [...camera.position] as [number, number, number];
                  pos[i] = parseFloat(e.target.value) || 0;
                  onCameraChange({ ...camera, position: pos });
                }}
                className="w-full bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-600"
              />
            </label>
          ))}
        </div>
        <span className="text-[10px] font-mono text-zinc-500">FOV</span>
        <input
          type="number"
          step={1}
          value={camera.fov}
          onChange={(e) => {
            onCameraChange({ ...camera, fov: parseFloat(e.target.value) || 50 });
          }}
          className="w-full bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-600"
        />
      </div>

      {/* Camera rotation */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-200">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500">Camera Rotation</span>
          <button
            onClick={() => {
              onCameraChange({
                ...camera,
                rotation: lookAtRotation(camera.position),
              });
            }}
            className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-600 transition-colors"
          >
            Look at Center
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <label key={axis} className="block">
              <span className="text-[9px] font-mono text-zinc-400 uppercase">{axis}</span>
              <input
                type="number"
                step={0.01}
                value={camera.rotation[i]}
                onChange={(e) => {
                  const rot = [...camera.rotation] as [number, number, number];
                  rot[i] = parseFloat(e.target.value) || 0;
                  onCameraChange({ ...camera, rotation: rot });
                }}
                className="w-full bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-600"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
