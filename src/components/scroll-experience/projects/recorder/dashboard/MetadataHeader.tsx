import type { SessionMeta } from "./lib/dashboardTypes";

export function MetadataHeader({ meta }: { meta: SessionMeta }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{meta.title}</h1>
      <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
        <span className="tabular-nums">
          {meta.startLabel} – {meta.endLabel}
        </span>
        <span>·</span>
        <span>{meta.room}</span>
      </div>
    </div>
  );
}
