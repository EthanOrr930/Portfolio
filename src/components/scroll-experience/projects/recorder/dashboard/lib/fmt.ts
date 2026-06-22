import type { TranscriptParagraph, AudienceQuestion } from "./dashboardTypes";

/** Seconds → "M:SS". */
export function fmtMSS(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s - m * 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export type InterleavedItem =
  | { kind: "paragraph"; idx: number; start: number; p: TranscriptParagraph }
  | { kind: "question"; start: number; q: AudienceQuestion };

/** Merge paragraphs + audience questions by start time (paragraph wins ties). */
export function interleave(
  paragraphs: TranscriptParagraph[],
  questions: AudienceQuestion[],
): InterleavedItem[] {
  const items: InterleavedItem[] = [];
  paragraphs.forEach((p, idx) => items.push({ kind: "paragraph", idx, start: p.start ?? 0, p }));
  questions.forEach((q) => items.push({ kind: "question", start: q.recordingTimestampSec, q }));
  items.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.kind === "paragraph" && b.kind !== "paragraph") return -1;
    if (a.kind !== "paragraph" && b.kind === "paragraph") return 1;
    return 0;
  });
  return items;
}
