"use client";

import type {
  ModelTransition,
  CascadeOrigin,
  PositionEasingType,
} from "@/lib/animation/types";

interface TransitionInspectorProps {
  transition: ModelTransition;
  onChange: (updates: Partial<ModelTransition>) => void;
  onDelete: () => void;
}

const CASCADE_ORIGINS: { value: CascadeOrigin; label: string }[] = [
  { value: "top-down", label: "Top Down" },
  { value: "bottom-up", label: "Bottom Up" },
  { value: "left-right", label: "Left to Right" },
  { value: "right-left", label: "Right to Left" },
  { value: "front-back", label: "Front to Back" },
  { value: "back-front", label: "Back to Front" },
  { value: "build-top-down", label: "Build: Top Down" },
  { value: "build-bottom-up", label: "Build: Bottom Up" },
  { value: "build-left-right", label: "Build: Left to Right" },
  { value: "build-right-left", label: "Build: Right to Left" },
  { value: "build-front-back", label: "Build: Front to Back" },
  { value: "build-back-front", label: "Build: Back to Front" },
  { value: "random", label: "Random" },
];

const POSITION_EASINGS: { value: PositionEasingType; label: string }[] = [
  { value: "smoothstep", label: "Smoothstep" },
  { value: "ease-in-cubic", label: "Ease In Cubic" },
  { value: "ease-out-cubic", label: "Ease Out Cubic" },
  { value: "ease-in-out-cubic", label: "Ease In-Out Cubic" },
  { value: "ease-out-elastic", label: "Ease Out Elastic" },
  { value: "linear", label: "Linear" },
];

export function TransitionInspector({
  transition,
  onChange,
  onDelete,
}: TransitionInspectorProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
          Transition
        </h3>
        <button
          onClick={onDelete}
          className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-zinc-500 block mb-1">
          Cascade Direction
        </label>
        <select
          value={transition.cascadeOrigin}
          onChange={(e) =>
            onChange({ cascadeOrigin: e.target.value as CascadeOrigin })
          }
          className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400"
        >
          {CASCADE_ORIGINS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-zinc-500 block mb-1">
          Cascade Spread: {transition.cascadeSpread.toFixed(2)}
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={transition.cascadeSpread}
          onChange={(e) =>
            onChange({ cascadeSpread: parseFloat(e.target.value) })
          }
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[9px] text-zinc-400">
          <span>All at once</span>
          <span>Spread out</span>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-zinc-500 block mb-1">
          Position Easing
        </label>
        <select
          value={transition.positionEasing}
          onChange={(e) =>
            onChange({
              positionEasing: e.target.value as PositionEasingType,
            })
          }
          className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400"
        >
          {POSITION_EASINGS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
