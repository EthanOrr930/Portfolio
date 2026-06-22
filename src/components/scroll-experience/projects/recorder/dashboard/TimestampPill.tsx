"use client";

import { dispatchAudioSeek } from "./lib/audioSeek";

const BASE =
  "inline-flex items-center px-1.5 py-0.5 rounded text-[0.7rem] font-mono font-medium " +
  "tabular-nums bg-blue-50 text-blue-700 border border-blue-200 " +
  "hover:bg-blue-100 hover:border-blue-300 active:bg-blue-200 transition-colors cursor-pointer";

/**
 * Clickable {{ts}} pill. On activation it dispatches a `che-audio-seek`
 * CustomEvent that the AudioPlayer listens for — pills never touch the audio
 * element directly. `role=button` (not <button>) so heading pills can nest
 * inside the section's <button> without invalid HTML.
 */
export function TimestampPill({
  totalSec,
  label,
  variant = "inline",
}: {
  totalSec: number;
  label: string;
  variant?: "inline" | "heading";
}) {
  const seek = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatchAudioSeek(totalSec);
  };
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={seek}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && seek(e)}
      className={variant === "heading" ? `${BASE} shrink-0 ml-2` : `${BASE} align-baseline mx-0.5`}
      title={`Jump to ${label}`}
    >
      {label}
    </span>
  );
}
