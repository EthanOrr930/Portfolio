"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Mail, FileDown } from "lucide-react";
import { NEUMORPHIC, inset, raised } from "../../projects/city/neumorphic";

// LinkedIn + GitHub brand marks (lucide 1.x dropped brand icons).
const GITHUB_PATH =
  "M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.979 7.521 10.436.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.866-.014 1.485.797 1.691 1.128.99 1.663 2.571 1.196 3.196.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.288 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.43 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.979 23 16.854 23 12c0-6.077-4.922-11-11-11Z";
const LINKEDIN_PATH =
  "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z";

const LINKS = [
  { label: "Email", href: "mailto:coder930@gmail.com", icon: <Mail size={16} strokeWidth={2} /> },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ethankorr/", icon: <BrandIcon path={LINKEDIN_PATH} /> },
  { label: "GitHub", href: "https://github.com/EthanOrr930", icon: <BrandIcon path={GITHUB_PATH} /> },
  { label: "Resume", href: "https://rxresu.me/coder930/ethan-orr-resume-2026", icon: <FileDown size={16} strokeWidth={2} /> },
] as const;

/** The four contact pills under the lead paragraph. */
export function ContactLinks() {
  return (
    <div style={ROW}>
      {LINKS.map((link) => (
        <LinkPill key={link.label} href={link.href} icon={link.icon} label={link.label} />
      ))}
    </div>
  );
}

function LinkPill({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const mail = href.startsWith("mailto:");
  return (
    <a
      href={href}
      target={mail ? undefined : "_blank"}
      rel={mail ? undefined : "noopener noreferrer"}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        ...PILL,
        color: hover ? NEUMORPHIC.accentDeep : NEUMORPHIC.ink,
        boxShadow: pressed ? inset(4, 9) : raised(hover ? 8 : 6, hover ? 18 : 14),
        transform: pressed ? "scale(0.97)" : hover ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function BrandIcon({ path }: { path: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={path} />
    </svg>
  );
}

const ROW: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  width: "max-content",
  maxWidth: "100%",
  gap: 9,
  pointerEvents: "auto",
};

const PILL: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "10px 13px",
  borderRadius: 13,
  background: NEUMORPHIC.surface,
  textDecoration: "none",
  whiteSpace: "nowrap",
  fontFamily: "var(--font-geist-sans), ui-sans-serif, sans-serif",
  fontSize: "0.8rem",
  fontWeight: 500,
  letterSpacing: "0.01em",
  transition: "box-shadow 200ms ease, transform 200ms ease, color 200ms ease",
};
