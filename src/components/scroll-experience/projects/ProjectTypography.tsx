"use client";

import type { CSSProperties, ComponentProps } from "react";

/**
 * Site-wide typography primitives — ONE hierarchy everywhere (hero, projects,
 * skills, future sections). Compose copy through these; never hand-roll type
 * styles at call sites.
 *
 *   Eyebrow    — Geist Mono, uppercase, wide-tracked label
 *   Headline   — Fraunces serif, uppercase display (size: "hero" | "section")
 *   Body       — Geist Sans, sentence case, relaxed paragraph
 *   BulletList — Geist Sans em-dash bullets (the scannable body voice)
 *
 * `Project*` aliases are kept for the project copy blocks (their headline runs
 * nowrap so its width defines the copy column). All forward ref + className +
 * style, so scroll-animated callers (HeroText) can drive them directly.
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

const HEADLINE_BASE: CSSProperties = {
  fontFamily: "var(--font-fraunces), Georgia, serif",
  fontWeight: 300,
  fontVariationSettings: '"opsz" 144, "SOFT" 20',
  letterSpacing: "-0.025em",
  textTransform: "uppercase",
  lineHeight: 0.95,
  color: "#1c1c1f",
  margin: 0,
};

const HEADLINE_SIZE = {
  hero: "clamp(2.75rem, 6.5vw, 5.75rem)",
  section: "clamp(2rem, 4.2vw, 3.75rem)",
} as const;
type HeadlineSize = keyof typeof HEADLINE_SIZE;

const BODY_STYLE: CSSProperties = {
  fontFamily: "var(--font-geist-sans), ui-sans-serif, sans-serif",
  fontSize: "clamp(0.9rem, 1.1vw, 1.05rem)",
  fontWeight: 300,
  lineHeight: 1.55,
  color: "#52525b",
  margin: 0,
};

// Em-dash bullets — Geist Sans, sentence case, grid hanging-indent so wrapped
// lines align past the marker. Stretches to the headline width (width:0 +
// minWidth:100%); marker/text colours are props, width overridable via `style`.
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

export function Eyebrow({ style, ...rest }: ComponentProps<"p">) {
  return <p {...rest} style={{ ...EYEBROW_STYLE, ...style }} />;
}

interface HeadlineProps extends ComponentProps<"h2"> {
  /** "hero" = oversized hero title, "section" = section header (default). */
  size?: HeadlineSize;
  /** Single line — used by project copy blocks whose width defines the column. */
  nowrap?: boolean;
  /** Heading level — "h1" for the page's hero title, "h2" elsewhere. */
  as?: "h1" | "h2";
}

export function Headline({ size = "section", nowrap = false, as: Tag = "h2", style, ...rest }: HeadlineProps) {
  return (
    <Tag
      {...rest}
      style={{ ...HEADLINE_BASE, fontSize: HEADLINE_SIZE[size], whiteSpace: nowrap ? "nowrap" : undefined, ...style }}
    />
  );
}

export function Body({ style, ...rest }: ComponentProps<"p">) {
  return <p {...rest} style={{ ...BODY_STYLE, ...style }} />;
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

export function BulletList({ items, markerColor = "#7a6a4f", textColor = "#52525b", style, ...rest }: BulletListProps) {
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

// ── Back-compat aliases for the project copy blocks ──
export const ProjectEyebrow = Eyebrow;
export const ProjectBulletList = BulletList;
export function ProjectHeadline(props: ComponentProps<"h2">) {
  return <Headline nowrap {...props} />;
}
