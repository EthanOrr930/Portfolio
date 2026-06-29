"use client";

import { useState, type CSSProperties } from "react";
import { NEUMORPHIC, inset, raised } from "../../city/neumorphic";

/**
 * "View gallery" pill — same molded neumorphic language as RepoButton, but a
 * button that opens the Session Recorder image carousel.
 */
export function GalleryButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        ...PILL,
        boxShadow: pressed ? inset(5, 11) : raised(hover ? 9 : 7, hover ? 20 : 16),
        transform: pressed ? "scale(0.98)" : hover ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={hover ? NEUMORPHIC.accent : NEUMORPHIC.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transition: "stroke 200ms ease" }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.6" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span>View gallery</span>
    </button>
  );
}

const PILL: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 11,
  padding: "13px 22px",
  borderRadius: 16,
  border: "none",
  cursor: "pointer",
  pointerEvents: "auto",
  width: "fit-content",
  background: NEUMORPHIC.surface,
  color: NEUMORPHIC.ink,
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: "0.72rem",
  fontWeight: 500,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  transition: "box-shadow 200ms ease, transform 200ms ease",
};
