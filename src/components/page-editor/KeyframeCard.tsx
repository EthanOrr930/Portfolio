"use client";

import type { KeyframeData } from "@/lib/pages/types";

interface KeyframeCardProps {
  keyframe: KeyframeData;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onLabelChange: (label: string) => void;
}

export function KeyframeCard({
  keyframe,
  index,
  selected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onLabelChange,
}: KeyframeCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        selected
          ? "border-blue-400/40 bg-blue-400/5"
          : "border-zinc-200 bg-white/3 hover:bg-zinc-100"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
            {index + 1}
          </span>
          <input
            value={keyframe.label}
            onChange={(e) => onLabelChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent text-xs font-mono text-zinc-700 outline-none border-b border-transparent focus:border-zinc-300 min-w-0 w-full"
          />
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className="w-5 h-5 text-[10px] text-zinc-500 hover:text-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            ^
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className="w-5 h-5 text-[10px] text-zinc-500 hover:text-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            v
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-5 h-5 text-[10px] text-red-400/50 hover:text-red-400/80"
          >
            x
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-zinc-400">
        <span>{keyframe.elements.length} text</span>
        <span>{keyframe.particles.exrPath.split("/").pop()}</span>
      </div>
    </div>
  );
}
