"use client";

import type { CalloutDom } from "./CalloutDriver";

const INK = "#1c1c1f";
const FADE = "opacity 0.35s ease";

/**
 * The DOM layer for the tutorial callout: a ring + centre dot + leader line
 * (SVG) and a small mono label, all driven by CalloutDriver each frame. Site
 * type + ink; non-invasive. Rendered outside the Canvas, click-through.
 */
export function RecorderTutorialOverlay({ dom }: { dom: CalloutDom }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 30 }}>
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <line
          ref={dom.line}
          stroke={INK}
          strokeWidth={1.4}
          style={{ opacity: 0, transition: FADE }}
        />
        <circle
          ref={dom.circle}
          r={26}
          fill="none"
          stroke={INK}
          strokeWidth={2}
          style={{ opacity: 0, transition: FADE }}
        />
        <circle ref={dom.dot} r={3} fill={INK} style={{ opacity: 0, transition: FADE }} />
      </svg>
      <div
        ref={dom.label}
        style={{
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
        }}
      />
    </div>
  );
}
