// Parses the AI-notes Markdown into a recursive tree of headings (H2 → H3 → …)
// so each heading renders as its own collapsible section. Ported as-is from the
// CHE admin aiSummaryParse.ts (pure markdown ↔ tree; no backend deps).

export interface ParsedSection {
  level: number; // 2 = H2, 3 = H3, …
  title: string;
  timestampSec: number | null;
  timestampLabel: string | null; // "5:30"
  body: string;
  children: ParsedSection[];
}

const HEADING_TS_RE = /\s*\{\{ts:(\d+):(\d{2})\}\}\s*$/;
const HEADING_RE = /^(#{2,6})\s+(.+)$/;

export function parseNotesMarkdown(md: string): {
  preamble: string;
  sections: ParsedSection[];
} {
  const lines = md.split("\n");
  const top: ParsedSection[] = [];
  const preambleLines: string[] = [];
  const stack: (ParsedSection | null)[] = new Array(7).fill(null);
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n");
    let target: ParsedSection | null = null;
    for (let lv = 6; lv >= 2; --lv) {
      if (stack[lv]) {
        target = stack[lv];
        break;
      }
    }
    if (target) target.body += (target.body ? "\n" : "") + text;
    else preambleLines.push(text);
    buffer = [];
  };

  for (const line of lines) {
    const m = HEADING_RE.exec(line);
    if (m) {
      flushBuffer();
      const level = m[1].length;
      const sec = makeSection(m[2], level);
      for (let lv = level; lv <= 6; ++lv) stack[lv] = null;
      let parent: ParsedSection | null = null;
      for (let lv = level - 1; lv >= 2; --lv) {
        if (stack[lv]) {
          parent = stack[lv];
          break;
        }
      }
      if (parent) parent.children.push(sec);
      else top.push(sec);
      stack[level] = sec;
    } else {
      buffer.push(line);
    }
  }
  flushBuffer();

  return { preamble: preambleLines.join("\n").trim(), sections: top };
}

function makeSection(rawHeading: string, level: number): ParsedSection {
  const trimmed = rawHeading.trim();
  const m = HEADING_TS_RE.exec(trimmed);
  if (m) {
    const minutes = parseInt(m[1], 10);
    return {
      level,
      title: trimmed.replace(HEADING_TS_RE, "").trim(),
      timestampSec: minutes * 60 + parseInt(m[2], 10),
      timestampLabel: `${minutes}:${m[2]}`,
      body: "",
      children: [],
    };
  }
  return { level, title: trimmed, timestampSec: null, timestampLabel: null, body: "", children: [] };
}

export function collectAllPaths(sections: ParsedSection[], parentPath = ""): string[] {
  const out: string[] = [];
  sections.forEach((s, i) => {
    const p = parentPath ? `${parentPath}.${i}` : `${i}`;
    out.push(p);
    if (s.children.length > 0) out.push(...collectAllPaths(s.children, p));
  });
  return out;
}
