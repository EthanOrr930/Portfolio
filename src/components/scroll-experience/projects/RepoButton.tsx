"use client";

import { useState, type CSSProperties } from "react";
import { NEUMORPHIC, inset, raised } from "./city/neumorphic";

/**
 * Repo link as a neumorphic pill — same molded language as the Clad in Plaid
 * play button (surface = page cream, raised box-shadow, presses to inset).
 * GitHub mark + label + a corner arrow that darts out on hover.
 */

// Official GitHub mark (octicon mark-github), filled with currentColor.
const GITHUB_MARK =
  "M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.979 7.521 10.436.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.866-.014 1.485.797 1.691 1.128.99 1.663 2.571 1.196 3.196.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.288 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.43 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.979 23 16.854 23 12c0-6.077-4.922-11-11-11Z";

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
  textDecoration: "none",
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: "0.72rem",
  fontWeight: 500,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  transition: "box-shadow 200ms ease, transform 200ms ease",
};

interface RepoButtonProps {
  href: string;
  label?: string;
}

export function RepoButton({ href, label = "View the build" }: RepoButtonProps) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        ...PILL,
        boxShadow: pressed ? inset(5, 11) : raised(hover ? 9 : 7, hover ? 20 : 16),
        transform: pressed ? "scale(0.98)" : hover ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <svg width={17} height={17} viewBox="0 0 24 24" fill={hover ? NEUMORPHIC.accent : NEUMORPHIC.ink} aria-hidden style={{ transition: "fill 200ms ease" }}>
        <path d={GITHUB_MARK} />
      </svg>
      <span>{label}</span>
      <svg
        width={13}
        height={13}
        viewBox="0 0 24 24"
        fill="none"
        stroke={NEUMORPHIC.eyebrow}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        style={{ transform: hover ? "translate(2px, -2px)" : "translate(0, 0)", transition: "transform 200ms ease" }}
      >
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </a>
  );
}
