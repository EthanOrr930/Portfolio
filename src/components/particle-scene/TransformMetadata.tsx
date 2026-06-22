"use client";

import type { TransformState } from "./types";

function formatVec3(v: [number, number, number]): string {
  return v.map((n) => n.toFixed(2)).join(", ");
}

export function TransformMetadata({ transform }: { transform: TransformState }) {
  return (
    <div className="fixed bottom-6 left-6 z-10 pointer-events-none">
      <div className="font-mono text-[11px] text-zinc-400 leading-relaxed">
        <p>pos  ({formatVec3(transform.position)})</p>
        <p>rot  ({formatVec3(transform.rotation)})</p>
        <p>scale {transform.scale.toFixed(2)}</p>
      </div>
    </div>
  );
}
