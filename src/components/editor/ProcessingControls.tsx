"use client";

import type { ProcessingParams } from "@/lib/geometry/types";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function Slider({ label, value, min, max, step, onChange, disabled }: SliderProps) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-600">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-zinc-500"
      />
    </div>
  );
}

export function ProcessingControls({
  params,
  onChange,
  onProcess,
  disabled,
  hasModel,
}: {
  params: ProcessingParams;
  onChange: (p: ProcessingParams) => void;
  onProcess: () => void;
  disabled?: boolean;
  hasModel: boolean;
}) {
  const set = <K extends keyof ProcessingParams>(key: K, val: ProcessingParams[K]) =>
    onChange({ ...params, [key]: val });

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
        Parameters
      </h3>
      <Slider label="Samples" value={params.sampleCount} min={1000} max={20000} step={500} onChange={(v) => set("sampleCount", v)} disabled={disabled} />
      <Slider label="Lloyd passes" value={params.lloydPasses} min={0} max={5} step={1} onChange={(v) => set("lloydPasses", v)} disabled={disabled} />
      <Slider label="Curvature threshold" value={params.curvatureThreshold} min={0} max={1} step={0.05} onChange={(v) => set("curvatureThreshold", v)} disabled={disabled} />
      <Slider label="Curvature K" value={params.curvatureK} min={4} max={16} step={1} onChange={(v) => set("curvatureK", v)} disabled={disabled} />
      <Slider label="Noise freq" value={params.noiseFreq} min={0.1} max={5} step={0.1} onChange={(v) => set("noiseFreq", v)} disabled={disabled} />

      <button
        onClick={onProcess}
        disabled={disabled || !hasModel}
        className="w-full mt-2 px-3 py-2 text-sm font-mono bg-zinc-100 text-zinc-900 border border-zinc-300 rounded hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Process
      </button>
    </div>
  );
}
