import type { Speaker } from "./lib/dashboardTypes";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

export function SpeakerChips({ speakers }: { speakers: Speaker[] }) {
  if (speakers.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {speakers.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700"
        >
          <span className="w-2 h-2 rounded-full" style={{ background: COLORS[s.id % COLORS.length] }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}
