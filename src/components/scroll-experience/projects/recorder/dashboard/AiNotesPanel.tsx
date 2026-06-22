"use client";

import { useMemo, useState } from "react";
import { parseNotesMarkdown, collectAllPaths } from "./lib/aiNotesParse";
import { AiNotesSection } from "./AiNotesSection";

/** The AI-notes outline: parses the markdown once, owns expand/collapse state. */
export function AiNotesPanel({ markdown }: { markdown: string }) {
  const { sections } = useMemo(() => parseNotesMarkdown(markdown), [markdown]);
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());

  const toggle = (path: string) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  if (sections.length === 0) return <div className="text-sm text-gray-500 py-4">No notes.</div>;

  const allPaths = collectAllPaths(sections);
  const anyOpen = openSet.size > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Outline · {sections.length} section{sections.length === 1 ? "" : "s"}
        </div>
        <button
          type="button"
          onClick={() => setOpenSet(anyOpen ? new Set() : new Set(allPaths))}
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded px-2 py-1 transition-colors"
        >
          {anyOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      {sections.map((sec, i) => (
        <AiNotesSection key={i} section={sec} path={`${i}`} openSet={openSet} onToggle={toggle} />
      ))}
    </div>
  );
}
