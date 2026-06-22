"use client";

interface Props {
  rotation: [number, number, number];
  onChange: (rot: [number, number, number]) => void;
  disabled?: boolean;
}

function AxisSlider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const deg = Math.round((value * 180) / Math.PI);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-600">{deg}&deg;</span>
      </div>
      <input
        type="range"
        min={-Math.PI}
        max={Math.PI}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-zinc-500"
      />
    </div>
  );
}

export function RotationControls({ rotation, onChange, disabled }: Props) {
  const [rx, ry, rz] = rotation;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
          Rotation
        </h3>
        <button
          onClick={() => onChange([0, 0, 0])}
          disabled={disabled}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-700 disabled:opacity-30"
        >
          Reset
        </button>
      </div>
      <AxisSlider label="X" value={rx} onChange={(v) => onChange([v, ry, rz])} disabled={disabled} />
      <AxisSlider label="Y" value={ry} onChange={(v) => onChange([rx, v, rz])} disabled={disabled} />
      <AxisSlider label="Z" value={rz} onChange={(v) => onChange([rx, ry, v])} disabled={disabled} />
    </div>
  );
}
