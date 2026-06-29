"use client";

import type { CSSProperties } from "react";
import { NEUMORPHIC, raised } from "../../projects/city/neumorphic";
import { Eyebrow, Headline, Body } from "../../projects/ProjectTypography";
import { CONTACT_COPY } from "./contactCopy";
import type { SendState } from "../contactTypes";

/**
 * Final confirmation once the plane has flown. Honest about delivery: a clean
 * success when the email actually sent, a fallback address when it didn't.
 */
export function SuccessCard({ sendState, error }: { sendState: SendState; error: string | null }) {
  const failed = sendState === "error";
  return (
    <div style={WRAP}>
      <div className="contact-success" style={CARD}>
        <Eyebrow>{failed ? "Almost" : "Sent"}</Eyebrow>
        <Headline size="section">{failed ? "It flew, but…" : CONTACT_COPY.success.title}</Headline>
        <Body>
          {failed
            ? `The email didn’t go through — reach me directly at coder930@gmail.com.`
            : CONTACT_COPY.success.body}
        </Body>
        {failed && error && <p style={DETAIL}>{error}</p>}
      </div>
    </div>
  );
}

const WRAP: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
};

const CARD: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  maxWidth: "30rem",
  padding: "2.6rem 3rem",
  borderRadius: 22,
  background: NEUMORPHIC.surface,
  boxShadow: raised(10, 26),
  textAlign: "center",
  alignItems: "center",
  pointerEvents: "auto",
};

const DETAIL: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: "0.7rem",
  letterSpacing: "0.04em",
  color: NEUMORPHIC.inkSoft,
  opacity: 0.7,
};
