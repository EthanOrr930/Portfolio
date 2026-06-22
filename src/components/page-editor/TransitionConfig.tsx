"use client";

import type { KeyframeData, CascadeOrigin, EasingType, PositionEasingType } from "@/lib/pages/types";

interface TransitionConfigProps {
  /** The DESTINATION keyframe (transition data lives on keyframes[toIndex]) */
  keyframe: KeyframeData;
  onChange: (updates: Partial<KeyframeData>) => void;
  fromLabel: string;
  toLabel: string;
}

export function TransitionConfig({ keyframe, onChange, fromLabel, toLabel }: TransitionConfigProps) {
  const { transition } = keyframe;

  const updateTransition = (updates: Partial<KeyframeData["transition"]>) => {
    onChange({ transition: { ...transition, ...updates } });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
        Transition: {fromLabel} → {toLabel}
      </h3>

      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Scroll Duration ({transition.scrollDuration.toFixed(1)} vh)
        </span>
        <input
          type="range"
          min={0.5}
          max={6}
          step={0.1}
          value={transition.scrollDuration}
          onChange={(e) => updateTransition({ scrollDuration: +e.target.value })}
          className="w-full accent-white/50"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Cascade Spread ({transition.cascadeSpread.toFixed(2)})
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={transition.cascadeSpread}
          onChange={(e) => updateTransition({ cascadeSpread: +e.target.value })}
          className="w-full accent-white/50"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">Cascade Direction</span>
        <select
          value={transition.cascadeOrigin}
          onChange={(e) => updateTransition({ cascadeOrigin: e.target.value as CascadeOrigin })}
          className="w-full mt-1 bg-zinc-100 border border-zinc-200 rounded px-2 py-1 text-xs font-mono text-zinc-700"
        >
          <optgroup label="Dissolve (from source)">
            <option value="top-down">Top Down</option>
            <option value="bottom-up">Bottom Up</option>
            <option value="left-right">Left → Right</option>
            <option value="right-left">Right → Left</option>
            <option value="front-back">Front → Back</option>
            <option value="back-front">Back → Front</option>
          </optgroup>
          <optgroup label="Build (into destination)">
            <option value="build-top-down">Build Top Down</option>
            <option value="build-bottom-up">Build Bottom Up</option>
            <option value="build-left-right">Build Left → Right</option>
            <option value="build-right-left">Build Right → Left</option>
            <option value="build-front-back">Build Front → Back</option>
            <option value="build-back-front">Build Back → Front</option>
          </optgroup>
          <optgroup label="Other">
            <option value="random">Random</option>
          </optgroup>
        </select>
      </label>

      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">Scroll Easing</span>
        <select
          value={transition.easing}
          onChange={(e) => updateTransition({ easing: e.target.value as EasingType })}
          className="w-full mt-1 bg-zinc-100 border border-zinc-200 rounded px-2 py-1 text-xs font-mono text-zinc-700"
        >
          <option value="ease-in-out">Ease In Out</option>
          <option value="ease-in">Ease In</option>
          <option value="ease-out">Ease Out</option>
          <option value="linear">Linear</option>
        </select>
      </label>

      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">Position Easing</span>
        <select
          value={transition.positionEasing ?? "smoothstep"}
          onChange={(e) => updateTransition({ positionEasing: e.target.value as PositionEasingType })}
          className="w-full mt-1 bg-zinc-100 border border-zinc-200 rounded px-2 py-1 text-xs font-mono text-zinc-700"
        >
          <option value="smoothstep">Smoothstep</option>
          <option value="ease-in-cubic">Ease In Cubic</option>
          <option value="ease-out-cubic">Ease Out Cubic</option>
          <option value="ease-in-out-cubic">Ease In Out Cubic</option>
          <option value="ease-out-elastic">Ease Out Elastic</option>
          <option value="linear">Linear</option>
        </select>
      </label>
    </div>
  );
}
