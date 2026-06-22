"use client";

import { vhToPx } from "./useTimelineDrag";

interface PlayheadProps {
  currentVh: number;
}

export function Playhead({ currentVh }: PlayheadProps) {
  const left = vhToPx(currentVh);

  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
      style={{ left }}
    >
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rotate-45 rounded-sm" />
    </div>
  );
}
