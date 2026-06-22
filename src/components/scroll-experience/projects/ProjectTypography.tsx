"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Typography primitives for the Projects section. Match the HeroText
 * system (same fonts, sizing/tracking, colors) so the projects read as
 * continuations of the same type hierarchy.
 *
 *   ProjectEyebrow    — Geist Mono, uppercase, wide-tracked label
 *   ProjectHeadline   — Fraunces serif, display size, tight tracking
 *   ProjectBulletList — Geist Sans bullets, sentence case, em-dash marker —
 *                       the single shared body voice for every project
 *
 * Every project composes its copy through these primitives; do not hand-roll
 * inline styles at call sites. If a new style is needed, add a primitive here.
 */

const EYEBROW_STYLE: CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: "clamp(0.68rem, 0.82vw, 0.82rem)",
  fontWeight: 400,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
  color: "#7a6a4f",
  margin: 0,
  lineHeight: 1,
};

const HEADLINE_STYLE: CSSProperties = {
  fontFamily: "var(--font-fraunces), Georgia, serif",
  fontSize: "clamp(2rem, 4.2vw, 3.75rem)",
  fontWeight: 300,
  fontVariationSettings: '"opsz" 144, "SOFT" 20',
  letterSpacing: "-0.025em",
  textTransform: "uppercase",
  lineHeight: 0.95,
  color: "#1c1c1f",
  margin: 0,
  // Single line — its rendered width defines the copy block, which the bullet
  // list then stretches to fill (see BULLET_LIST_STYLE).
  whiteSpace: "nowrap",
};

// Shared body voice — Geist Sans, sentence case (proper nouns/acronyms keep
// their natural case), an em-dash marker in warm brown, grid hanging-indent so
// wrapped lines align past the marker. Stretches to the headline width
// (width:0 + minWidth:100%); marker/text colours are props so each project can
// tint to its own backdrop, and the width can be overridden via `style`.
const BULLET_LIST_STYLE: CSSProperties = {
  fontFamily: "var(--font-geist-sans), ui-sans-serif, sans-serif",
  fontSize: "clamp(0.9rem, 1.1vw, 1.05rem)",
  fontWeight: 300,
  lineHeight: 1.5,
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.7em",
  width: 0,
  minWidth: "100%",
};

const BULLET_ITEM_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.85em 1fr",
  columnGap: "0.7em",
  alignItems: "baseline",
};

const BULLET_MARK_STYLE: CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

interface TypographyProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Forwarded for scroll/reveal data flags (data-shown, etc.). */
  "data-shown"?: string;
}

interface BulletListProps {
  items: string[];
  /** Em-dash marker colour (default warm brown). */
  markerColor?: string;
  /** Body text colour (default body grey). */
  textColor?: string;
  className?: string;
  style?: CSSProperties;
  "data-shown"?: string;
}

export function ProjectEyebrow(props: TypographyProps) {
  return <p {...props} style={{ ...EYEBROW_STYLE, ...props.style }} />;
}

export function ProjectHeadline(props: TypographyProps) {
  return <h2 {...props} style={{ ...HEADLINE_STYLE, ...props.style }} />;
}

export function ProjectBulletList({
  items,
  markerColor = "#7a6a4f",
  textColor = "#52525b",
  style,
  ...rest
}: BulletListProps) {
  return (
    <ul {...rest} style={{ ...BULLET_LIST_STYLE, color: textColor, ...style }}>
      {items.map((item, i) => (
        <li key={i} style={BULLET_ITEM_STYLE}>
          <span aria-hidden style={{ ...BULLET_MARK_STYLE, color: markerColor }}>
            —
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
