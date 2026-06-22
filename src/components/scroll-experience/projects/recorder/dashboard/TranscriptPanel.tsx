import { interleave } from "./lib/fmt";
import { TranscriptRow } from "./TranscriptRow";
import { AudienceQuestionCard } from "./AudienceQuestionCard";
import type { DeepgramResult, AudienceQuestion, Speaker } from "./lib/dashboardTypes";

interface Props {
  transcript: DeepgramResult;
  questions: AudienceQuestion[];
  speakers: Speaker[];
}

/** Transcript view: confidence header + chronological (top→bottom) rows/cards. */
export function TranscriptPanel({ transcript, questions, speakers }: Props) {
  const alt = transcript.results?.channels?.[0]?.alternatives?.[0];
  const paragraphs = alt?.paragraphs?.paragraphs;
  if (!alt || !paragraphs || paragraphs.length === 0) {
    return <div className="text-sm text-gray-500 py-4">No transcript data available.</div>;
  }
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">Confidence: {(alt.confidence * 100).toFixed(0)}%</div>
      <div className="space-y-3 text-sm leading-relaxed">
        {interleave(paragraphs, questions)
          .map((item) =>
            item.kind === "paragraph" ? (
              <TranscriptRow key={`p-${item.idx}`} p={item.p} speakers={speakers} />
            ) : (
              <AudienceQuestionCard key={`q-${item.q.id}`} q={item.q} />
            ),
          )}
      </div>
    </div>
  );
}
