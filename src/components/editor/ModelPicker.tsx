"use client";

import { useRef } from "react";

const BUILT_IN_MODELS = [
  { name: "Brain", path: "/models/Brain_low_poly_obj.obj" },
  { name: "Heart", path: "/models/heart.glb" },
  { name: "Diamond", path: "/models/diamond.glb" },
  { name: "Lightbulb", path: "/models/lightbulb.glb" },
  { name: "Chat Bubble", path: "/models/chat-bubble.glb" },
];

export function ModelPicker({
  selected,
  onSelect,
  disabled,
}: {
  selected: string | File | null;
  onSelect: (source: string | File) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedName =
    selected instanceof File
      ? selected.name
      : typeof selected === "string"
        ? selected
        : null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
        Model
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {BUILT_IN_MODELS.map((m) => (
          <button
            key={m.path}
            onClick={() => onSelect(m.path)}
            disabled={disabled}
            className={`px-2 py-1.5 text-xs font-mono rounded border transition-colors ${
              selectedName === m.path
                ? "border-zinc-400 bg-zinc-100 text-zinc-900"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="pt-1">
        <input
          ref={fileRef}
          type="file"
          accept=".glb,.gltf,.obj,.fbx,.stl"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="w-full px-2 py-1.5 text-xs font-mono text-zinc-600 border border-dashed border-zinc-200 rounded hover:border-zinc-300 hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Import file...
        </button>
      </div>
    </div>
  );
}
