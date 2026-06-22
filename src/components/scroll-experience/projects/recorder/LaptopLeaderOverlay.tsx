"use client";

import type { RefObject } from "react";

export interface LeaderRef {
  line: RefObject<SVGLineElement | null>;
  label: RefObject<HTMLDivElement | null>;
}

const INK = "#1c1c1f";
const FADE = "opacity 0.45s ease";

/** DOM layer for the laptop's "here's the summary" leaders — a leader line +
 *  mono label per anchor, driven by LaptopLeaders each frame. Click-through. */
export function LaptopLeaderOverlay({ leaders }: { leaders: LeaderRef[] }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 30 }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {leaders.map((l, i) => (
          <line key={i} ref={l.line} stroke={INK} strokeWidth={1.4} style={{ opacity: 0, transition: FADE }} />
        ))}
      </svg>
      {leaders.map((l, i) => (
        <div key={i} ref={l.label} style={labelStyle} />
      ))}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  position: "absolute",
  transform: "translateY(-50%)",
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: 12.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: INK,
  whiteSpace: "nowrap",
  padding: "5px 9px",
  borderRadius: 5,
  background: "rgba(244, 239, 231, 0.82)",
  backdropFilter: "blur(2px)",
  opacity: 0,
  transition: FADE,
};
