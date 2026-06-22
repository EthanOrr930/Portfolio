"use client";

import { PIXELS_PER_VH } from "./useTimelineDrag";

interface TimelineRulerProps {
  totalWidth: number;
}

export function TimelineRuler({ totalWidth }: TimelineRulerProps) {
  const totalVh = totalWidth / PIXELS_PER_VH;
  const ticks: number[] = [];

  for (let vh = 0; vh <= totalVh; vh += 0.5) {
    ticks.push(vh);
  }

  return (
    <div
      className="relative h-6 border-b border-zinc-200 flex-shrink-0 select-none"
      style={{ width: totalWidth }}
    >
      {ticks.map((vh) => {
        const isMajor = vh % 1 === 0;
        return (
          <div
            key={vh}
            className="absolute top-0"
            style={{ left: vh * PIXELS_PER_VH }}
          >
            <div
              className={`w-px ${isMajor ? "h-4 bg-zinc-300" : "h-2 bg-zinc-200"}`}
            />
            {isMajor && (
              <span className="absolute top-3 -translate-x-1/2 text-[10px] text-zinc-400 tabular-nums">
                {vh}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
