"use client";

import type { ParsedSection } from "./lib/aiNotesParse";
import { AiNotesBody, rewriteTimestamps } from "./AiNotesBody";
import { TimestampPill } from "./TimestampPill";
import { Chevron } from "./Chevron";

interface Props {
  section: ParsedSection;
  path: string;
  openSet: Set<string>;
  onToggle: (path: string) => void;
}

const PROSE =
  "max-w-none prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ul:pl-5 " +
  "prose-ul:list-disc prose-li:my-1.5 prose-li:leading-relaxed prose-li:marker:text-gray-400 " +
  "prose-strong:font-semibold prose-strong:text-gray-900 prose-headings:font-semibold " +
  "prose-table:my-3 prose-th:bg-gray-50 prose-th:font-semibold prose-td:align-top " +
  "prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 " +
  "prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none";

export function AiNotesSection({ section, path, openSet, onToggle }: Props) {
  const open = openSet.has(path);
  const depth = Math.max(0, section.level - 2); // 0 = H2, 1 = H3, 2+ = H4…
  const s = depthStyles(depth);

  return (
    <div className={s.outer}>
      <button type="button" onClick={() => onToggle(path)} aria-expanded={open} className={s.header}>
        <Chevron open={open} className={`shrink-0 ${s.chevron}`} />
        <div className={`flex-1 min-w-0 leading-snug ${s.title}`}>{rewriteTimestamps(section.title)}</div>
        {section.timestampLabel && section.timestampSec != null && (
          <TimestampPill
            totalSec={section.timestampSec}
            label={section.timestampLabel}
            variant={depth === 0 ? "heading" : "inline"}
          />
        )}
      </button>
      {open && (
        <div className={s.bodyWrap}>
          <div className={s.indent}>
            {section.body && (
              <div className={`prose prose-sm ${PROSE}`}>
                <AiNotesBody markdown={section.body} />
              </div>
            )}
            {section.children.map((child, j) => (
              <AiNotesSection
                key={j}
                section={child}
                path={`${path}.${j}`}
                openSet={openSet}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function depthStyles(depth: number) {
  if (depth === 0) {
    return {
      outer: "rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-gray-300 transition-colors",
      header: "w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-gray-50 transition-colors",
      chevron: "w-4 h-4 text-gray-500",
      title: "font-semibold text-gray-900 text-[0.95rem]",
      bodyWrap: "px-3.5 pb-3 pt-1",
      indent: "border-l-2 border-blue-100 pl-4 ml-1 space-y-2",
    };
  }
  if (depth === 1) {
    return {
      outer: "rounded-md hover:bg-gray-50/60 transition-colors",
      header: "w-full flex items-center gap-2 px-2 py-1.5 text-left",
      chevron: "w-3.5 h-3.5 text-gray-500",
      title: "font-semibold text-gray-800 text-[0.875rem]",
      bodyWrap: "pl-2 pb-2 pt-0.5",
      indent: "border-l-2 border-gray-200 pl-3 ml-1.5 space-y-1.5",
    };
  }
  return {
    outer: "rounded",
    header: "w-full flex items-center gap-2 px-2 py-1 text-left",
    chevron: "w-3 h-3 text-gray-400",
    title: "font-medium text-gray-700 text-[0.8125rem]",
    bodyWrap: "pl-2 pb-1.5 pt-0.5",
    indent: "border-l border-gray-200 pl-2.5 ml-1.5 space-y-1",
  };
}
