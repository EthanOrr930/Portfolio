"use client";

import { useState, type CSSProperties } from "react";
import { ProjectEyebrow, ProjectHeadline, ProjectBulletList } from "../ProjectTypography";
import { GalleryButton } from "./gallery/GalleryButton";
import { GalleryModal } from "./gallery/GalleryModal";

// Smooth text float-in — the site's standard .project-copy-enter (staggered
// translateX + expo-out), toggled by `shown`. Sits on the left so it clears the
// device (which scootches right). The column has no width cap, so it shrink-wraps
// to the headline (nowrap) and the bullet list stretches to that exact width.
const ENTER_MS = { eyebrow: 300, headline: 360, body: 320 };
const STAGGER_MS = { eyebrow: 0, headline: 70, body: 140 };

const BULLETS = [
  "ESP32 capture device — ESP-IDF firmware, BLE + SoftAP Wi-Fi provisioning, over-the-air updates",
  "Records each breakout session on-device and uploads to Google Cloud Storage",
  "Cloud Function pipeline transcribes with Deepgram — speaker-labeled, word-timed",
  "Gemini 2.5 Pro distills the transcript into a structured, timestamped outline",
  "Firestore-backed Next.js dashboard: transcript + AI notes with clickable timestamp deep-links",
  "Built end to end in under one month — custom circuit, 3D-printed case, firmware, web",
];

function enter(enterMs: number, delayMs: number): CSSProperties {
  // why: CSS custom properties aren't part of the CSSProperties type.
  return {
    "--project-copy-distance": "44px",
    "--project-copy-enter-dur": `${enterMs}ms`,
    "--project-copy-exit-dur": `${Math.round(enterMs * 0.6)}ms`,
    "--project-copy-delay": `${delayMs}ms`,
  } as CSSProperties;
}

/**
 * PROJECT 03 copy — the conference Session Recorder. DOM overlay shown only
 * while the recorder device is on stage (handed off to the laptop afterward).
 */
export function ProjectThreeCopy({ shown }: { shown: boolean }) {
  const s = shown ? "true" : "false";
  const [galleryOpen, setGalleryOpen] = useState(false);
  return (
    <div className="fixed inset-0 z-30" style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: "7vw", top: "50%", transform: "translateY(-50%)" }}>
        <div className="flex flex-col gap-5">
          <ProjectEyebrow data-shown={s} className="project-copy-enter" style={enter(ENTER_MS.eyebrow, STAGGER_MS.eyebrow)}>
            Project 03
          </ProjectEyebrow>
          <ProjectHeadline data-shown={s} className="project-copy-enter" style={enter(ENTER_MS.headline, STAGGER_MS.headline)}>
            Session Recorder
          </ProjectHeadline>
          <ProjectBulletList
            data-shown={s}
            className="project-copy-enter"
            style={enter(ENTER_MS.body, STAGGER_MS.body)}
            items={BULLETS}
          />
          <div data-shown={s} className="project-copy-enter" style={{ ...enter(ENTER_MS.body, STAGGER_MS.body + 80), marginTop: "0.5rem" }}>
            <GalleryButton onClick={() => setGalleryOpen(true)} />
          </div>
        </div>
      </div>
      <GalleryModal open={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </div>
  );
}
