"use client";

import type { CSSProperties } from "react";
import { Send } from "lucide-react";
import { NEUMORPHIC, raised } from "../../projects/city/neumorphic";
import { CONTACT_COPY } from "./contactCopy";
import type { ContactPhase, SendState } from "../contactTypes";

interface FoldButtonProps {
  phase: ContactPhase;
  sendState: SendState;
  valid: boolean;
  onSend: () => void;
}

interface Resolved {
  label: string;
  disabled: boolean;
  action?: () => void;
}

/**
 * The neumorphic Send button. One control: Send folds the sheet and flings it —
 * label tracks the phase (Send → Sending… → Folding… → Off it goes…). A paper
 * plane sits beside the text, nodding to what the sheet becomes.
 */
export function FoldButton({ phase, sendState, valid, onSend }: FoldButtonProps) {
  const { label, disabled, action } = resolve(phase, sendState, valid, onSend);
  return (
    <button className="neu-button" style={btnStyle(disabled)} disabled={disabled} onClick={action}>
      <Send size={18} strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

function resolve(
  phase: ContactPhase,
  sendState: SendState,
  valid: boolean,
  onSend: () => void,
): Resolved {
  const c = CONTACT_COPY.button;
  switch (phase) {
    case "filling":
      return {
        label: sendState === "sending" ? c.sending : c.send,
        disabled: !valid || sendState === "sending",
        action: onSend,
      };
    case "folding":
      return { label: c.folding, disabled: true };
    case "flying":
      return { label: c.flying, disabled: true };
    case "sent":
      return { label: c.sent, disabled: true };
  }
}

function btnStyle(disabled: boolean): CSSProperties {
  return {
    alignSelf: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    appearance: "none",
    border: "none",
    cursor: disabled ? "default" : "pointer",
    pointerEvents: "auto",
    background: NEUMORPHIC.surface,
    color: disabled ? NEUMORPHIC.inkSoft : NEUMORPHIC.ink,
    boxShadow: raised(9, 22),
    borderRadius: 999,
    padding: "20px 40px",
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: 15,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    opacity: disabled ? 0.62 : 1,
    transition: "opacity 300ms ease, box-shadow 160ms ease, transform 160ms ease",
  };
}
