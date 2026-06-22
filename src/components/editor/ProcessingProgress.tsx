"use client";

import type { ProgressInfo } from "@/lib/geometry/types";

export function ProcessingProgress({ info }: { info: ProgressInfo }) {
  const pct = Math.round(info.progress * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-zinc-600">{info.stage}</span>
        <span className="text-zinc-500">{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-400 rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
