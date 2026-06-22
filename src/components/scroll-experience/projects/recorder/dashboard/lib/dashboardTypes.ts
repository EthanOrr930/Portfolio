// Boundary types for the recording-detail dashboard. Recreated from the real
// CHE admin / Deepgram shapes, stripped of Firestore.

export interface TranscriptSentence {
  text: string;
  start: number;
  end?: number;
}

export interface TranscriptParagraph {
  speaker?: number;
  start?: number;
  end?: number;
  sentences?: TranscriptSentence[];
}

export interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  paragraphs?: { paragraphs?: TranscriptParagraph[] };
}

export interface DeepgramResult {
  results: { channels: Array<{ alternatives: DeepgramAlternative[] }> };
}

export interface AudienceQuestion {
  id: string;
  askerName: string;
  text: string;
  recordingTimestampSec: number;
}

export interface Speaker {
  id: number;
  name: string;
}

export interface SessionMeta {
  title: string;
  room: string;
  startLabel: string; // e.g. "3:00 PM"
  endLabel: string; // e.g. "4:30 PM"
}

/** The single object the dashboard renders from. */
export interface SessionData {
  meta: SessionMeta;
  speakers: Speaker[];
  transcript: DeepgramResult;
  questions: AudienceQuestion[];
  aiNotesMarkdown: string;
  audioSrc: string;
  /** Autoscroll: position the player here on load (e.g. skip the intro). */
  initialSeekSec?: number;
}
