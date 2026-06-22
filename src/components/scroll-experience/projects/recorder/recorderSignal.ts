// Decoupled signal between Project 2 (city) and Project 3 (recorder). The city
// fires `intro` the instant its copy slides out, so the device spins in right
// then — no dead scroll gap. On scroll-up the city's bolt reverses and the copy
// slides back; it fires `reset` so the recorder drops back below frame to replay.
// Mirrors notesLeaderSignal.ts.

const INTRO = "che-recorder-intro";
const RESET = "che-recorder-reset";

function dispatch(name: string): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(name));
}

function subscribe(name: string, cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(name, cb);
  return () => window.removeEventListener(name, cb);
}

export function fireRecorderIntro(): void {
  dispatch(INTRO);
}

export function onRecorderIntro(cb: () => void): () => void {
  return subscribe(INTRO, cb);
}

export function fireRecorderReset(): void {
  dispatch(RESET);
}

export function onRecorderReset(cb: () => void): () => void {
  return subscribe(RESET, cb);
}
