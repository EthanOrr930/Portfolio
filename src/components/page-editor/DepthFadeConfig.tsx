"use client";

import type { KeyframeData } from "@/lib/pages/types";

interface DepthFadeConfigProps {
  particles: KeyframeData["particles"];
  onChange: (updates: Partial<KeyframeData["particles"]>) => void;
}

export function DepthFadeConfig({ particles, onChange }: DepthFadeConfigProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
        Depth Fade
      </h3>

      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Far ({(particles.depthFar ?? 3.5).toFixed(1)})
        </span>
        <input
          type="range"
          min={1}
          max={10}
          step={0.1}
          value={particles.depthFar ?? 3.5}
          onChange={(e) => onChange({ depthFar: +e.target.value })}
          className="w-full accent-white/50"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Near ({(particles.depthNear ?? 1.8).toFixed(1)})
        </span>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={particles.depthNear ?? 1.8}
          onChange={(e) => onChange({ depthNear: +e.target.value })}
          className="w-full accent-white/50"
        />
      </label>
    </div>
  );
}
