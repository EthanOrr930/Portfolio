"use client";

import type { CSSProperties, ReactNode } from "react";
import { Html } from "@react-three/drei";
import type { ContactInput } from "@/lib/contact/resendRequest";
import { CONTACT_COPY } from "./contactCopy";

// px → world for drei <Html transform>, which renders via a fixed ~60 factor
// (see laptopConstants: 0.088 fits an 1100px surface). 0.22 makes the 430px card
// render ~1:1 on screen so it fills the sheet — NOT the ~50× too-small 0.0044.
const HTML_SCALE = 0.22;

interface ContactFormProps {
  values: ContactInput;
  interactive: boolean;
  onChange: (next: ContactInput) => void;
}

/**
 * The form, mounted ON the sheet via a transformed drei <Html> so it tilts with
 * the paper. Clearly labelled, bordered fields so it reads as a fillable card —
 * the bottom neumorphic button (not this card) submits.
 */
export function ContactForm({ values, interactive, onChange }: ContactFormProps) {
  const pe = interactive ? "auto" : "none";
  const set = (patch: Partial<ContactInput>) => onChange({ ...values, ...patch });
  return (
    <Html transform position={[0, 0, 0.04]} scale={HTML_SCALE} zIndexRange={[30, 0]} prepend style={{ pointerEvents: pe }}>
      <div style={{ ...CARD, pointerEvents: pe }} onWheel={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <p style={NOTE_TITLE}>Write me a note</p>
        <Field label="Your email">
          <input
            className="contact-field" style={INPUT} type="email" autoComplete="email"
            placeholder={CONTACT_COPY.fields.email} value={values.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label="Subject">
          <input
            className="contact-field" style={INPUT}
            placeholder={CONTACT_COPY.fields.subject} value={values.subject}
            onChange={(e) => set({ subject: e.target.value })}
          />
        </Field>
        <Field label="Message" grow>
          <textarea
            className="contact-field" style={{ ...INPUT, ...BODY }} rows={5}
            placeholder={CONTACT_COPY.fields.body} value={values.body}
            onChange={(e) => set({ body: e.target.value })}
          />
        </Field>
      </div>
    </Html>
  );
}

function Field({ label, grow, children }: { label: string; grow?: boolean; children: ReactNode }) {
  return (
    <label style={{ ...FIELD_WRAP, flex: grow ? 1 : undefined }}>
      <span style={LABEL}>{label}</span>
      {children}
    </label>
  );
}

const CARD: CSSProperties = {
  width: 430,
  height: 520,
  padding: "44px 48px 48px",
  display: "flex",
  flexDirection: "column",
  gap: 18,
  boxSizing: "border-box",
};

// Matches the "Contact me" section headline — Fraunces serif, black, large.
const NOTE_TITLE: CSSProperties = {
  margin: "0 0 6px",
  fontFamily: "var(--font-fraunces), Georgia, serif",
  fontWeight: 300,
  fontVariationSettings: '"opsz" 144, "SOFT" 20',
  fontSize: 34,
  letterSpacing: "-0.025em",
  lineHeight: 0.95,
  textTransform: "uppercase",
  color: "#1c1c1f",
};

const FIELD_WRAP: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const LABEL: CSSProperties = {
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8c7c5e",
};

const INPUT: CSSProperties = {
  // Neumorphic carved field — cream ground + inset shadow (see .contact-field).
  background: "#e9e0d0",
  border: "none",
  borderRadius: 12,
  outline: "none",
  padding: "16px 18px",
  fontFamily: "Georgia, serif",
  fontSize: 16,
  color: "#2b2722",
  resize: "none",
  width: "100%",
  boxSizing: "border-box",
};

const BODY: CSSProperties = {
  flex: 1,
  lineHeight: 1.45,
};
