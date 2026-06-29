"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { NEUMORPHIC, raised, inset } from "../projects/city/neumorphic";
import { SKILL_PROJECTS } from "./skillsData";

const MUTED = "#9d8f72";
const THUMB = 62;

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
}

/** Project thumbnails as tabs. A single carved (inset) well slides to whichever
 *  thumbnail is active — positioned by measuring the active thumbnail, so it
 *  translates cleanly between them (no shared-layout projection guesswork). */
export function ProjectThumbTabs({ activeId, onSelect }: Props) {
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const [box, setBox] = useState({ x: 0, y: 0, w: THUMB, h: THUMB });
  const activeIdx = SKILL_PROJECTS.findIndex((p) => p.id === activeId);

  useLayoutEffect(() => {
    const measure = () => {
      const el = btns.current[activeIdx];
      if (el) setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIdx]);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        gap: 18,
        flexWrap: "wrap",
        padding: 12,
        borderRadius: 26,
        background: NEUMORPHIC.surfaceDeep,
        boxShadow: inset(6, 14),
      }}
    >
      {/* The whole track is a carved channel; only the active tab is a raised
          pill lifted out of it — spanning the FULL column (thumbnail + label)
          so it bridges both sides and lifts the whole tab, sliding + resizing
          between projects. */}
      <motion.span
        aria-hidden
        initial={false}
        animate={{ x: box.x, y: box.y, width: box.w, height: box.h }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        style={{ position: "absolute", top: 0, left: 0, borderRadius: 22, background: NEUMORPHIC.surface, boxShadow: raised(6, 14), pointerEvents: "none" }}
      />
      {SKILL_PROJECTS.map((p, i) => {
        const active = p.id === activeId;
        const Glyph = p.Glyph;
        return (
          <button
            key={p.id}
            type="button"
            ref={(el) => { btns.current[i] = el; }}
            onClick={() => onSelect(p.id)}
            style={BTN}
          >
            <span
              style={{ position: "relative", width: THUMB, height: THUMB, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", boxShadow: "none" }}
            >
              <Glyph size={26} strokeWidth={1.6} color={active ? p.accent : MUTED} aria-hidden />
            </span>
            <span style={{ ...NAME, color: active ? NEUMORPHIC.ink : MUTED }}>{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}

const BTN: CSSProperties = {
  position: "relative", // sit above the sliding raised pill
  background: "none",
  border: "none",
  padding: "13px 18px 11px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 9,
};

const NAME: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 500,
  letterSpacing: "0.01em",
  whiteSpace: "nowrap",
  fontFamily: "var(--font-geist-sans), ui-sans-serif, sans-serif",
  transition: "color 200ms ease",
};
