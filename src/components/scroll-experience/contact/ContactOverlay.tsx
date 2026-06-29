"use client";

import type { CSSProperties } from "react";
import { ContactSideText } from "./ui/ContactSideText";
import { ContactLinks } from "./ui/ContactLinks";
import { FoldButton } from "./ui/FoldButton";
import { SuccessCard } from "./ui/SuccessCard";
import { CONTACT_COPY } from "./ui/contactCopy";
import { NEUMORPHIC } from "../projects/city/neumorphic";
import type { ContactPhase, SendState } from "./contactTypes";

interface ContactOverlayProps {
  phase: ContactPhase;
  sendState: SendState;
  error: string | null;
  valid: boolean;
  onSend: () => void;
}

/**
 * DOM layer above the canvas: a left column with the "Contact me" copy, four
 * contact links, and the Send / fold button; the result card on completion.
 */
export function ContactOverlay(props: ContactOverlayProps) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={column(props.phase !== "sent")}>
        <ContactSideText />
        <ContactLinks />
        {props.phase !== "sent" && (
          <div style={ACTIONS}>
            <FoldButton
              phase={props.phase}
              sendState={props.sendState}
              valid={props.valid}
              onSend={props.onSend}
            />
            <SendStatus sendState={props.sendState} />
          </div>
        )}
      </div>
      {props.phase === "sent" && <SuccessCard sendState={props.sendState} error={props.error} />}
    </div>
  );
}

function SendStatus({ sendState }: { sendState: SendState }) {
  const text =
    sendState === "sent" ? CONTACT_COPY.status.sent : sendState === "error" ? CONTACT_COPY.status.error : null;
  if (!text) return null;
  return <p style={{ ...STATUS, color: sendState === "error" ? "#a8603f" : NEUMORPHIC.inkSoft }}>{text}</p>;
}

function column(visible: boolean): CSSProperties {
  return {
    position: "absolute",
    left: "7vw",
    top: "50%",
    // Slides out to the left as it fades when the message is on its way.
    transform: `translateY(-50%) translateX(${visible ? "0px" : "-70px"})`,
    display: "flex",
    flexDirection: "column",
    gap: "1.6rem",
    maxWidth: "30rem",
    opacity: visible ? 1 : 0,
    transition: "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1), transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
    pointerEvents: "none",
  };
}

const ACTIONS: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.85rem",
  marginTop: "0.4rem",
};

const STATUS: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: "0.72rem",
  letterSpacing: "0.06em",
  pointerEvents: "none",
};
