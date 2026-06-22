import { fmtMSS } from "./lib/fmt";
import type { AudienceQuestion } from "./lib/dashboardTypes";

/** Amber audience-question card, interleaved into the transcript by time. */
export function AudienceQuestionCard({ q }: { q: AudienceQuestion }) {
  return (
    <div className="flex gap-3 items-start rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2">
      <div className="shrink-0 w-16 text-xs text-amber-700 font-mono tabular-nums pt-0.5">
        {fmtMSS(q.recordingTimestampSec)}
        <div className="text-[0.6rem] text-amber-700/70 mt-0.5 uppercase tracking-wide">Audience</div>
      </div>
      <div className="flex-1 text-gray-800">
        <div className="text-xs font-semibold text-amber-700 mb-0.5">{q.askerName} asked</div>
        <div>{q.text}</div>
      </div>
    </div>
  );
}
