"use client";

import type { RefObject } from "react";
import { ProjectCard } from "./ProjectCard";
import { ProjectModelGroups } from "./ProjectModelGroups";
import { ProjectModelStage } from "./ProjectModelStage";
import { PROJECTS } from "./projectsData";
import { sideForIndex } from "./types";
import { useProjectReveal } from "./useProjectReveal";
import { useMouseNdcRef, type MouseNdc } from "./useMouseNdcRef";
import type { ProjectPhase } from "./ProjectStageDriver";

/** Per-project vh windows, spaced after the panel finishes sliding up. */
const PANEL_TO_REVEAL_PAUSE_VH = 0.2;
// Settled-cube dwell: the window the cubes float in the water (not transitioning)
// — widened for a bit of dead scroll space before they fall away.
const PROJECT_DWELL_VH = 2.8;

interface ProjectsViewportProps {
  scrollVhRef: RefObject<number>;
  /** Scroll vh where the projects panel finishes sliding up — reveal
   *  scheduling starts here. */
  revealBaseVh: number;
}

/**
 * Orchestrator inside the sliding projects panel. Hosts the shared R3F
 * canvas for every project's model and the DOM layer for every project's
 * copy card. Owns a single mouseNdcRef that every project stage consumes
 * for the water-torque effect.
 */
export function ProjectsViewport({ scrollVhRef, revealBaseVh }: ProjectsViewportProps) {
  const mouseNdcRef = useMouseNdcRef();
  // The shafts fade out as the last project's cubes fall away.
  const fallVh = windowForProject(revealBaseVh, PROJECTS.length - 1).hideVh;
  return (
    <>
      <ProjectModelStage scrollVhRef={scrollVhRef} revealBaseVh={revealBaseVh} fallVh={fallVh}>
        {PROJECTS.map((project, index) => (
          <ProjectModelSlot
            key={project.id}
            index={index}
            scrollVhRef={scrollVhRef}
            revealBaseVh={revealBaseVh}
            mouseNdcRef={mouseNdcRef}
          />
        ))}
      </ProjectModelStage>

      {PROJECTS.map((project, index) => (
        <ProjectDomSlot
          key={project.id}
          index={index}
          scrollVhRef={scrollVhRef}
          revealBaseVh={revealBaseVh}
        />
      ))}
    </>
  );
}

function windowForProject(revealBaseVh: number, index: number) {
  const revealVh =
    revealBaseVh + PANEL_TO_REVEAL_PAUSE_VH + index * PROJECT_DWELL_VH;
  // Every project exits after its dwell — including the last, so its cubes
  // fall away as the Project-2 city flies in.
  const hideVh = revealVh + PROJECT_DWELL_VH;
  return { revealVh, hideVh };
}

interface ProjectSlotProps {
  index: number;
  scrollVhRef: RefObject<number>;
  revealBaseVh: number;
}

function ProjectModelSlot({
  index,
  scrollVhRef,
  revealBaseVh,
  mouseNdcRef,
}: ProjectSlotProps & { mouseNdcRef: RefObject<MouseNdc> }) {
  const project = PROJECTS[index];
  const side = sideForIndex(index);
  const phase = useProjectReveal(scrollVhRef, windowForProject(revealBaseVh, index));
  const Model = project.Model;
  return (
    <ProjectModelGroups side={side} phase={phase} mouseNdcRef={mouseNdcRef}>
      <Model />
    </ProjectModelGroups>
  );
}

function ProjectDomSlot({ index, scrollVhRef, revealBaseVh }: ProjectSlotProps) {
  const project = PROJECTS[index];
  const side = sideForIndex(index);
  const phase = useProjectReveal(scrollVhRef, windowForProject(revealBaseVh, index));
  return (
    <ProjectCard
      project={project}
      side={side}
      oneBasedIndex={index + 1}
      revealed={phase === "revealed"}
    />
  );
}

export type { ProjectPhase };
