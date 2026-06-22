"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { prefersReducedMotion } from "./motionTokens";
import { PanelSlideDriver } from "./projects/PanelSlideDriver";
import { ProjectsViewport } from "./projects/ProjectsViewport";

interface ProjectsSectionProps {
  scrollVhRef: RefObject<number>;
  startVh: number;
  slideDurationVh: number;
}

/**
 * Projects section — a cream panel that slides up over the particle scene
 * as the cascade finishes, then hosts the project slideshow. Orchestration
 * only: the slide-up lives in PanelSlideDriver, the content inside lives
 * in ProjectsViewport.
 */
export function ProjectsSection({
  scrollVhRef,
  startVh,
  slideDurationVh,
}: ProjectsSectionProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const driver = new PanelSlideDriver({
      panel,
      scrollVhRef,
      startVh,
      slideDurationVh,
      reducedMotion,
    });
    return driver.start();
  }, [scrollVhRef, startVh, slideDurationVh, reducedMotion]);

  const revealBaseVh = startVh + slideDurationVh;

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-10 overflow-hidden"
      style={{
        transform: "translateY(100%)",
        willChange: "transform",
        background:
          "radial-gradient(ellipse at 50% 35%, #f9f5ef 0%, #ece4d6 70%, #d8cdb8 100%)",
      }}
    >
      <ProjectsViewport scrollVhRef={scrollVhRef} revealBaseVh={revealBaseVh} />
    </div>
  );
}
