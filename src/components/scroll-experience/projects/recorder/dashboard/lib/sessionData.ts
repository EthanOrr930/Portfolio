import type { SessionData } from "./dashboardTypes";
import { PICKERING_TRANSCRIPT } from "./pickeringTranscript";
import { PICKERING_NOTES } from "./pickeringNotes";

// Real recording: "The Future of Astronomy" — Edward C. Pickering's 1909 address
// (LibriVox public-domain reading). Both the transcript and the AI notes are
// REAL pipeline output: the audio at public/audio/session.mp3 was transcribed by
// Deepgram (nova-3, diarized) and summarized by Gemini 2.5 Pro using CHE's own
// admin endpoints (see scripts/). The {{ts}} pills and transcript rows carry the
// actual audio timestamps.

export const SAMPLE_SESSION: SessionData = {
  meta: {
    title: "The Future of Astronomy",
    room: "Case School of Applied Science",
    startLabel: "9:00 AM",
    endLabel: "9:33 AM",
  },
  speakers: [{ id: 0, name: "Prof. Edward C. Pickering" }],
  questions: [],
  aiNotesMarkdown: PICKERING_NOTES,
  audioSrc: "/audio/session.mp3",
  transcript: PICKERING_TRANSCRIPT,
};
