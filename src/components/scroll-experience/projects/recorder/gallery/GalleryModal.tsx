"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { NEUMORPHIC, raised, inset } from "../../city/neumorphic";
import { Eyebrow, Headline, Body } from "../../ProjectTypography";
import { toCssBezier, easing } from "../../../motionTokens";
import { GALLERY_SLIDES } from "./galleryData";
import { useCarousel } from "./useCarousel";

interface GalleryModalProps {
  open: boolean;
  onClose: () => void;
}

/** Motion carousel popup for the Session Recorder build images. */
export function GalleryModal({ open, onClose }: GalleryModalProps) {
  const [hover, setHover] = useState(false);
  const { index, goto, next, prev } = useCarousel({
    count: GALLERY_SLIDES.length,
    autoplayMs: 6000,
    paused: hover,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const slide = GALLERY_SLIDES[index];

  return createPortal(
    <div className="gallery-backdrop" style={BACKDROP} onClick={onClose}>
      <div
        className="gallery-card" style={CARD}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button style={CLOSE} aria-label="Close gallery" onClick={onClose}>✕</button>
        <div style={STAGE}>
          <div style={{ ...TRACK, transform: `translateX(-${index * 100}%)` }}>
            {GALLERY_SLIDES.map((s) => (
              <div key={s.src} style={SLIDE}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.alt} style={IMG} />
              </div>
            ))}
          </div>
          <Arrow dir="left" onClick={prev} />
          <Arrow dir="right" onClick={next} />
        </div>
        <div key={index} className="gallery-caption" style={CAPTION}>
          <Eyebrow>{`${String(index + 1).padStart(2, "0")} / ${String(GALLERY_SLIDES.length).padStart(2, "0")}`}</Eyebrow>
          <Headline size="section">{slide.title}</Headline>
          <Body>{slide.caption}</Body>
        </div>
        <Dots count={GALLERY_SLIDES.length} index={index} onDot={goto} />
      </div>
    </div>,
    document.body,
  );
}

function Arrow({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  const [pressed, setPressed] = useState(false);
  const path = dir === "left" ? "M15 5 8 12l7 7" : "M9 5l7 7-7 7";
  const side: CSSProperties = dir === "left" ? { left: 16 } : { right: 16 };
  return (
    <button
      aria-label={dir === "left" ? "Previous" : "Next"}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{ ...ARROW, ...side, boxShadow: pressed ? inset(4, 9) : raised(6, 14) }}
    >
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={NEUMORPHIC.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </button>
  );
}

function Dots({ count, index, onDot }: { count: number; index: number; onDot: (i: number) => void }) {
  return (
    <div style={DOTS}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i} aria-label={`Slide ${i + 1}`} onClick={() => onDot(i)}
          style={{ ...DOT, width: i === index ? 26 : 9, background: i === index ? NEUMORPHIC.accent : "rgba(120,106,82,0.35)" }}
        />
      ))}
    </div>
  );
}

const BACKDROP: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "5vh 5vw",
  background: "rgba(28, 24, 20, 0.55)",
  backdropFilter: "blur(7px)",
};

const CARD: CSSProperties = {
  position: "relative",
  width: "min(880px, 100%)",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 22,
  borderRadius: 26,
  background: NEUMORPHIC.surface,
  boxShadow: raised(14, 40),
};

const CLOSE: CSSProperties = {
  position: "absolute",
  top: 14,
  right: 16,
  zIndex: 2,
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  background: NEUMORPHIC.surface,
  color: NEUMORPHIC.inkSoft,
  boxShadow: raised(4, 10),
  fontSize: 13,
};

const STAGE: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 16,
  background: "#16140f",
  boxShadow: inset(5, 16),
  aspectRatio: "16 / 10",
};

const TRACK: CSSProperties = {
  display: "flex",
  height: "100%",
  transition: `transform 620ms ${toCssBezier(easing.standard)}`,
};

const SLIDE: CSSProperties = {
  flex: "0 0 100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const IMG: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
};

const ARROW: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  background: NEUMORPHIC.surface,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const CAPTION: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "0 12px",
  minHeight: 132,
};

const DOTS: CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "center",
  alignItems: "center",
  paddingBottom: 4,
};

const DOT: CSSProperties = {
  height: 9,
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  padding: 0,
  transition: "width 300ms ease, background 300ms ease",
};
