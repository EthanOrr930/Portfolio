"use client";

import type { TransformKeyframe, BezierPreset } from "@/lib/animation/types";

interface TransformInspectorProps {
  keyframe: TransformKeyframe;
  onChange: (updates: Partial<TransformKeyframe>) => void;
  onDelete: () => void;
}

const EASING_OPTIONS: { value: BezierPreset; label: string }[] = [
  { value: "smooth", label: "Smooth" },
  { value: "linear", label: "Linear" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In-Out" },
];

function Vec3Input({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
  step?: number;
}) {
  return (
    <div className="mb-3">
      <label className="text-[11px] text-zinc-500 block mb-1">{label}</label>
      <div className="grid grid-cols-3 gap-1">
        {(["X", "Y", "Z"] as const).map((axis, i) => (
          <div key={axis} className="relative">
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">
              {axis}
            </span>
            <input
              type="number"
              step={step}
              value={value[i]}
              onChange={(e) => {
                const v = [...value] as [number, number, number];
                v[i] = parseFloat(e.target.value) || 0;
                onChange(v);
              }}
              className="w-full bg-white border border-zinc-200 rounded px-1 pl-5 py-1 text-xs text-zinc-800 tabular-nums focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="mb-3">
      <label className="text-[11px] text-zinc-500 block mb-1">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-800 tabular-nums focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200"
      />
    </div>
  );
}

export function TransformInspector({
  keyframe,
  onChange,
  onDelete,
}: TransformInspectorProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
          Transform Keyframe
        </h3>
        <button
          onClick={onDelete}
          className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors"
        >
          Delete
        </button>
      </div>

      <NumberInput
        label="Viewport Height (vh)"
        value={keyframe.vh}
        onChange={(v) => onChange({ vh: Math.max(0, v) })}
        min={0}
        step={0.5}
      />

      <Vec3Input
        label="Position"
        value={keyframe.position}
        onChange={(v) => onChange({ position: v })}
      />

      <Vec3Input
        label="Rotation (radians)"
        value={keyframe.rotation}
        onChange={(v) => onChange({ rotation: v })}
        step={0.01}
      />

      <NumberInput
        label="Scale"
        value={keyframe.scale}
        onChange={(v) => onChange({ scale: Math.max(0.01, v) })}
        min={0.01}
        max={10}
      />

      <div className="border-t border-zinc-100 pt-3 mt-3">
        <label className="text-[11px] text-zinc-500 block mb-1">
          Easing (from previous)
        </label>
        <select
          value={keyframe.easing.preset}
          onChange={(e) =>
            onChange({
              easing: { preset: e.target.value as BezierPreset },
            })
          }
          className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400"
        >
          {EASING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2">
        <button
          onClick={() =>
            onChange({
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: 1,
            })
          }
          className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Reset to identity
        </button>
      </div>
    </div>
  );
}
