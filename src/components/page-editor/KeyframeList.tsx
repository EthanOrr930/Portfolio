"use client";

import { KeyframeCard } from "./KeyframeCard";
import { createDefaultKeyframe } from "@/lib/pages/defaults";
import type { KeyframeData } from "@/lib/pages/types";

export type Selection =
  | { type: "keyframe"; index: number }
  | { type: "transition"; index: number }; // transition between keyframe[index] and keyframe[index+1]

interface KeyframeListProps {
  keyframes: KeyframeData[];
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onChange: (keyframes: KeyframeData[]) => void;
}

export function KeyframeList({
  keyframes,
  selection,
  onSelect,
  onChange,
}: KeyframeListProps) {
  const addKeyframe = () => {
    const newKf = createDefaultKeyframe({
      label: `Section ${keyframes.length + 1}`,
    });
    const updated = [...keyframes, newKf];
    onChange(updated);
    onSelect({ type: "keyframe", index: updated.length - 1 });
  };

  const deleteKeyframe = (index: number) => {
    if (keyframes.length <= 1) return;
    const updated = keyframes.filter((_, i) => i !== index);
    onChange(updated);
    const selIdx = selection.type === "keyframe" ? selection.index : selection.index;
    if (selIdx >= updated.length) {
      onSelect({ type: "keyframe", index: updated.length - 1 });
    } else if (selection.type === "keyframe" && selection.index === index) {
      onSelect({ type: "keyframe", index: Math.max(0, index - 1) });
    }
  };

  const moveKeyframe = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= keyframes.length) return;
    const updated = [...keyframes];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
    onSelect({ type: "keyframe", index: target });
  };

  const updateLabel = (index: number, label: string) => {
    const updated = keyframes.map((kf, i) =>
      i === index ? { ...kf, label } : kf,
    );
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
          Keyframes
        </h3>
        <button
          onClick={addKeyframe}
          className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
        >
          + Add
        </button>
      </div>

      <div className="space-y-1">
        {keyframes.map((kf, i) => (
          <div key={kf.id}>
            <KeyframeCard
              keyframe={kf}
              index={i}
              selected={selection.type === "keyframe" && selection.index === i}
              onSelect={() => onSelect({ type: "keyframe", index: i })}
              onDelete={() => deleteKeyframe(i)}
              onMoveUp={() => moveKeyframe(i, -1)}
              onMoveDown={() => moveKeyframe(i, 1)}
              isFirst={i === 0}
              isLast={i === keyframes.length - 1}
              onLabelChange={(label) => updateLabel(i, label)}
            />
            {/* Transition card between this keyframe and the next */}
            {i < keyframes.length - 1 && (
              <button
                onClick={() => onSelect({ type: "transition", index: i })}
                className={`w-full my-1 px-3 py-1.5 rounded border text-[10px] font-mono transition-colors ${
                  selection.type === "transition" && selection.index === i
                    ? "border-purple-400/40 bg-purple-400/10 text-purple-300/70"
                    : "border-zinc-200 bg-white/2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500"
                }`}
              >
                Transition {i + 1} → {i + 2}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
