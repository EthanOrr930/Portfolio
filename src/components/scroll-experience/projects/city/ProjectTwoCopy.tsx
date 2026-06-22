"use client";

import { useState, type CSSProperties, type RefObject } from "react";
import { CladInPlaidPlayer } from "./CladInPlaidPlayer";
import {
  ProjectBulletList,
  ProjectEyebrow,
  ProjectHeadline,
} from "../ProjectTypography";
import { NEUMORPHIC, inset, raised } from "./neumorphic";

interface ProjectTwoCopyProps {
  copyRef: RefObject<HTMLDivElement | null>;
}

// Slide-in motion (mirrors .project-copy-enter): the whole neumorphic card
// slides in from the right as one unit when the bolt fires. Toggled via
// data-shown by CityContents.
const SLIDE_PX = -56;
const ENTER_MS = 360;

function slideStyle(): CSSProperties {
  // why: CSS custom properties aren't part of the CSSProperties type.
  return {
    "--project-copy-distance": `${SLIDE_PX}px`,
    "--project-copy-enter-dur": `${ENTER_MS}ms`,
    "--project-copy-exit-dur": `${Math.round(ENTER_MS * 0.65)}ms`,
    "--project-copy-delay": "0ms",
  } as CSSProperties;
}

/**
 * PROJECT 02 card — a raised neumorphic panel carrying the Clad in Plaid copy
 * and a play button that boots the itch.io build in-browser. Slides in from the
 * right (data-shown, toggled by CityContents) the moment the bolt fires.
 */
export function ProjectTwoCopy({ copyRef }: ProjectTwoCopyProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <div ref={copyRef} className="fixed inset-0 z-30" style={{ pointerEvents: "none" }}>
        <div style={{ position: "absolute", right: "8vw", top: "62vh", transform: "translateY(-50%)", width: 380, maxWidth: "84vw" }}>
          <div
            data-shown="false"
            className="project-copy-enter"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: "28px 30px",
              borderRadius: 26,
              background: NEUMORPHIC.surface,
              textAlign: "left",
              ...slideStyle(),
            }}
          >
            <ProjectEyebrow style={{ color: NEUMORPHIC.eyebrow }}>
              Project 02
            </ProjectEyebrow>
            <ProjectHeadline
              style={{ color: NEUMORPHIC.ink, whiteSpace: "normal" }}
            >
              Clad in Plaid
            </ProjectHeadline>
            <ProjectBulletList
              items={POINTS}
              style={{
                color: NEUMORPHIC.inkSoft,
                textTransform: "none",
                letterSpacing: "normal",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, marginTop: 2 }}>
              <span style={playLabelStyle}>Play</span>
              <PlayButton onClick={() => setPlaying(true)} />
            </div>
          </div>
        </div>
      </div>
      <CladInPlaidPlayer open={playing} onClose={() => setPlaying(false)} />
    </>
  );
}

function PlayButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      aria-label="Play Clad in Plaid"
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: NEUMORPHIC.surface,
        color: NEUMORPHIC.accent,
        boxShadow: pressed ? inset(6, 12) : raised(hover ? 9 : 7, hover ? 20 : 16),
        transform: pressed ? "scale(0.96)" : hover ? "scale(1.04)" : "scale(1)",
        transition: "box-shadow 180ms ease, transform 180ms ease",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ marginLeft: 3 }}>
        <path d="M8 5 L19 12 L8 19 Z" fill="currentColor" />
      </svg>
    </button>
  );
}

// Recorder-style bullets (em-dash markers via ProjectBulletList) — short
// phrases, matching Project 03's treatment.
const POINTS: string[] = [
  "Solo game design competition build, shipped in 48 hours",
  "Made in Unity with C#",
  "Every mechanic, sprite & track hand-made",
  "Art drawn in GIMP",
];

const playLabelStyle: CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: "0.7rem",
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: NEUMORPHIC.eyebrow,
};
