"use client";

import { useEffect } from "react";
import { NEUMORPHIC, inset, raised } from "./neumorphic";

const ITCH_EMBED = "https://itch.io/embed-upload/4589395?color=ece4d6";
const ITCH_PAGE = "https://larty.itch.io/clad-in-plaid";
// Native itch embed aspect is 640:380 — scaled up keeping that exact ratio so
// the game fills the frame with no letterbox bars.
const GAME_W = 1200;
const GAME_H = 712;

interface CladInPlaidPlayerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen overlay that runs the Clad in Plaid itch.io build in-browser,
 * dressed as a neumorphic application window (title bar, close control, inset
 * screen). The iframe only mounts while open, so the game loads on demand.
 */
export function CladInPlaidPlayer({ open, onClose }: CladInPlaidPlayerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(34, 30, 22, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        padding: "4vmin",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: NEUMORPHIC.surface,
          borderRadius: 26,
          padding: 20,
          // Clean contained shadow — no neumorphic light halo bleeding onto the
          // dark backdrop where there's no matching surface behind it.
          boxShadow: "0 30px 70px -24px rgba(20, 16, 10, 0.6)",
          maxWidth: "94vw",
        }}
      >
        <PlayerTitleBar onClose={onClose} />
        <div
          style={{
            borderRadius: 16,
            padding: 12,
            background: NEUMORPHIC.surface,
            boxShadow: inset(7, 16),
          }}
        >
          <iframe
            title="Clad in Plaid"
            src={ITCH_EMBED}
            width={GAME_W}
            height={GAME_H}
            allow="autoplay; fullscreen; gamepad"
            allowFullScreen
            style={{
              display: "block",
              border: "none",
              borderRadius: 8,
              maxWidth: "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PlayerTitleBar({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "2px 6px 16px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: "1.05rem",
            fontWeight: 400,
            color: NEUMORPHIC.ink,
          }}
        >
          Clad in Plaid
        </span>
        <a
          href={ITCH_PAGE}
          target="_blank"
          rel="noreferrer noopener"
          style={{
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontSize: "0.62rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: NEUMORPHIC.eyebrow,
            textDecoration: "none",
          }}
        >
          larty.itch.io ↗
        </a>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close game"
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: NEUMORPHIC.surface,
          color: NEUMORPHIC.inkSoft,
          boxShadow: raised(5, 12),
          fontSize: "1rem",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
