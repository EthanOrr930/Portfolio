// Decoupled signal: the dashboard fires this when the visitor opens the AI Notes
// tab, and the 3D leader listens so it can fade out once its hint is followed.

const EVENT = "che-notes-viewed";

export function dismissNotesLeader(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

export function onNotesLeaderDismiss(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
