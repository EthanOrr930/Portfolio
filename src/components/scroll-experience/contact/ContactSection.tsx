"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { validateContact, type ContactInput } from "@/lib/contact/resendRequest";
import { prefersReducedMotion } from "../motionTokens";
import { PanelSlideDriver } from "../projects/PanelSlideDriver";
import { useMouseNdcRef } from "../projects/useMouseNdcRef";
import { ContactStage } from "./ContactStage";
import { ContactOverlay } from "./ContactOverlay";
import { useContactSend } from "./useContactSend";
import { useContactFlow } from "./useContactFlow";
import { EMPTY_CONTACT } from "./contactTypes";

interface ContactSectionProps {
  scrollVhRef: RefObject<number>;
  /** Scroll vh where the panel starts sliding up out of Project 03. */
  startVh: number;
  /** How long (in vh) the slide-up takes. */
  slideDurationVh: number;
  /** Warm up the canvas once scrolled past here (just before the slide). */
  mountVh: number;
}

/**
 * Contact finale — a cream panel that slides up out of Project 03 (reusing
 * PanelSlideDriver), hosting the 3D paper, its form, and the fold→flight→sent
 * flow. Orchestration only; the canvas lives in ContactStage, the DOM layer in
 * ContactOverlay, and the state machine in useContactFlow.
 */
export function ContactSection({ scrollVhRef, startVh, slideDurationVh, mountVh }: ContactSectionProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const mouseNdcRef = useMouseNdcRef();
  const [values, setValues] = useState<ContactInput>(EMPTY_CONTACT);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const { sendState, error, send } = useContactSend();
  const flow = useContactFlow({ values, reducedMotion, send });

  const active = useActiveGate(scrollVhRef, mountVh);
  usePanelSlide(panelRef, scrollVhRef, startVh, slideDurationVh, reducedMotion);

  const valid = validateContact(values).ok;
  return (
    <div ref={panelRef} className="fixed inset-0 overflow-hidden" style={PANEL_STYLE}>
      {active && (
        <ContactStage
          phase={flow.phase}
          interactive={flow.phase === "filling"}
          mouseNdcRef={mouseNdcRef}
          values={values}
          onValuesChange={setValues}
          onApi={flow.onApi}
          onFoldSettled={flow.onFoldSettled}
          onFlightComplete={flow.onFlightComplete}
        />
      )}
      <ContactOverlay
        phase={flow.phase}
        sendState={sendState}
        error={error}
        valid={valid}
        onSend={flow.onSend}
      />
    </div>
  );
}

/** Mount the canvas only near the section so it doesn't cost frames earlier. */
function useActiveGate(scrollVhRef: RefObject<number>, mountVh: number): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const onScroll = () =>
      setActive((prev) => {
        const next = (scrollVhRef.current ?? 0) > mountVh;
        return prev === next ? prev : next;
      });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollVhRef, mountVh]);
  return active;
}

/** Scroll-linked slide-up, reusing the projects panel driver. */
function usePanelSlide(
  panelRef: RefObject<HTMLDivElement | null>,
  scrollVhRef: RefObject<number>,
  startVh: number,
  slideDurationVh: number,
  reducedMotion: boolean,
): void {
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const driver = new PanelSlideDriver({ panel, scrollVhRef, startVh, slideDurationVh, reducedMotion });
    return driver.start();
  }, [panelRef, scrollVhRef, startVh, slideDurationVh, reducedMotion]);
}

const PANEL_STYLE: CSSProperties = {
  zIndex: 60,
  transform: "translateY(100%)",
  willChange: "transform",
  // Light cream tuned to the field ground (#e9e0d0) — no dark vignette edge.
  background: "radial-gradient(ellipse at 50% 40%, #f1ecdf 0%, #ece4d4 68%, #e6ddcc 100%)",
};
