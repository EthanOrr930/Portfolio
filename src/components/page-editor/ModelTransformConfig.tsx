import type { KeyframeData } from "@/lib/pages/types";

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

interface ModelTransformConfigProps {
  transform: KeyframeData["particles"]["transform"];
  onChange: (transform: KeyframeData["particles"]["transform"]) => void;
}

export function ModelTransformConfig({ transform, onChange }: ModelTransformConfigProps) {
  const pos = transform.position ?? [0, 0, 0];
  const rot = transform.rotation ?? [0, 0, 0];
  const scale = transform.scale ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
          Model Transform
        </h3>
        <button
          onClick={() =>
            onChange({ position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 })
          }
          className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-600 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Position */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-zinc-500">Position</span>
        <div className="grid grid-cols-3 gap-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <label key={axis} className="block">
              <span className="text-[9px] font-mono text-zinc-400 uppercase">{axis}</span>
              <input
                type="number"
                step={0.1}
                value={pos[i]}
                onChange={(e) => {
                  const next = [...pos] as [number, number, number];
                  next[i] = parseFloat(e.target.value) || 0;
                  onChange({ ...transform, position: next });
                }}
                className="w-full bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-600"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Rotation (displayed in degrees) */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-zinc-500">Rotation (deg)</span>
        <div className="grid grid-cols-3 gap-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <label key={axis} className="block">
              <span className="text-[9px] font-mono text-zinc-400 uppercase">{axis}</span>
              <input
                type="number"
                step={1}
                value={Math.round(rot[i] * RAD_TO_DEG)}
                onChange={(e) => {
                  const next = [...rot] as [number, number, number];
                  next[i] = (parseFloat(e.target.value) || 0) * DEG_TO_RAD;
                  onChange({ ...transform, rotation: next });
                }}
                className="w-full bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-600"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Scale */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-zinc-500">Scale ({scale.toFixed(1)})</span>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={scale}
          onChange={(e) =>
            onChange({ ...transform, scale: parseFloat(e.target.value) })
          }
          className="w-full accent-zinc-400"
        />
      </div>
    </div>
  );
}
