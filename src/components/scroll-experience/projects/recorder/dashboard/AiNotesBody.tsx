"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TimestampPill } from "./TimestampPill";

const TS_RE = /\{\{ts:(\d+):(\d{2})\}\}/g;

/** Walks the markdown children, swapping {{ts:M:SS}} text tokens for pills. */
export function rewriteTimestamps(children: ReactNode): ReactNode {
  if (typeof children === "string") return rewriteString(children);
  if (Array.isArray(children)) return children.map((c, i) => <span key={i}>{rewriteTimestamps(c)}</span>);
  return children;
}

function rewriteString(s: string): ReactNode {
  TS_RE.lastIndex = 0;
  if (!TS_RE.test(s)) {
    TS_RE.lastIndex = 0;
    return s;
  }
  TS_RE.lastIndex = 0;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = TS_RE.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const min = parseInt(m[1], 10);
    out.push(<TimestampPill key={key++} totalSec={min * 60 + parseInt(m[2], 10)} label={`${min}:${m[2]}`} />);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return <>{out}</>;
}

export function AiNotesBody({ markdown }: { markdown: string }) {
  if (!markdown.trim()) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p>{rewriteTimestamps(children)}</p>,
        li: ({ children }) => (
          <li className="marker:text-gray-400 leading-relaxed">{rewriteTimestamps(children)}</li>
        ),
        h4: ({ children }) => (
          <h4 className="text-[0.8125rem] font-semibold text-gray-800 mt-4 mb-1.5">
            {rewriteTimestamps(children)}
          </h4>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
