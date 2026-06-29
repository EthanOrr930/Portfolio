"use client";

import { Eyebrow, Headline, Body } from "../../projects/ProjectTypography";
import { CONTACT_COPY } from "./contactCopy";

/**
 * "Contact me" copy — eyebrow + headline + lead. Plain block; ContactOverlay's
 * left column owns positioning and reveal.
 */
export function ContactSideText() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", maxWidth: "24rem" }}>
      <Eyebrow>{CONTACT_COPY.eyebrow}</Eyebrow>
      <Headline size="section">{CONTACT_COPY.heading}</Headline>
      <Body>{CONTACT_COPY.lead}</Body>
    </div>
  );
}
