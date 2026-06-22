// Tiny global event bus decoupling {{ts:M:SS}} pills from the audio player.
// Ported as-is from the CHE admin audioSeek.ts.

const EVENT_NAME = "che-audio-seek";

export interface AudioSeekDetail {
  totalSec: number;
  play?: boolean; // default true
}

export function dispatchAudioSeek(totalSec: number, play = true): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AudioSeekDetail>(EVENT_NAME, { detail: { totalSec, play } }));
}

export function subscribeAudioSeek(cb: (detail: AudioSeekDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<AudioSeekDetail>;
    if (ce.detail) cb(ce.detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
