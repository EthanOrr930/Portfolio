import { fmtMSS } from "./lib/fmt";
import type { TranscriptParagraph, Speaker } from "./lib/dashboardTypes";

/** One speaker-labeled transcript paragraph: M:SS gutter + speaker + text. */
export function TranscriptRow({ p, speakers }: { p: TranscriptParagraph; speakers: Speaker[] }) {
  const name = speakerName(p.speaker, speakers);
  const text = (p.sentences ?? []).map((s) => s.text).join(" ");
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-16 text-xs text-gray-400 font-mono tabular-nums pt-0.5">
        {fmtMSS(p.start ?? 0)}
        {name && <div className="text-[0.65rem] text-gray-400 mt-0.5">{name}</div>}
      </div>
      <div className="flex-1 text-gray-800">{text}</div>
    </div>
  );
}

function speakerName(id: number | undefined, speakers: Speaker[]): string | null {
  if (id == null) return null;
  return speakers.find((s) => s.id === id)?.name ?? `Speaker ${id}`;
}
