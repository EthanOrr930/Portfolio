"use client";

export type TabKey = "transcript" | "notes";

export function Tabs({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const tab = (key: TabKey, label: string) => (
    <button
      type="button"
      onClick={() => onChange(key)}
      data-leader-anchor={key === "notes" ? "notes" : undefined}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        active === key ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-1 w-fit rounded-lg bg-gray-100/70 p-1">
      {tab("transcript", "Transcript")}
      {tab("notes", "AI Notes")}
    </div>
  );
}
