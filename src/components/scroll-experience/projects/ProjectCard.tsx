"use client";

import { ProjectCopy } from "./ProjectCopy";
import type { Project, ProjectSide } from "./types";

interface ProjectCardProps {
  project: Project;
  /** `side` is the TEXT side; the 3D model lives opposite. */
  side: ProjectSide;
  /** One-based position in the feed — drives the eyebrow label. */
  oneBasedIndex: number;
  revealed: boolean;
}

/**
 * DOM overlay for one project. Text lives on `side`, aligned toward the
 * outer viewport edge with breathing room. The 3D model renders in the
 * shared Canvas at the opposite half.
 */
export function ProjectCard({
  project,
  side,
  oneBasedIndex,
  revealed,
}: ProjectCardProps) {
  return (
    <div
      aria-hidden={!revealed}
      className="absolute inset-0 flex items-center"
      style={{ pointerEvents: revealed ? "auto" : "none" }}
    >
      {side === "left" ? (
        <>
          <CopyHalf side={side}>
            <ProjectCopy
              eyebrow={buildEyebrow(oneBasedIndex)}
              title={project.title}
              bullets={project.bullets}
              revealed={revealed}
            />
          </CopyHalf>
          <ModelSpacer />
        </>
      ) : (
        <>
          <ModelSpacer />
          <CopyHalf side={side}>
            <ProjectCopy
              eyebrow={buildEyebrow(oneBasedIndex)}
              title={project.title}
              bullets={project.bullets}
              revealed={revealed}
            />
          </CopyHalf>
        </>
      )}
    </div>
  );
}

function CopyHalf({
  side,
  children,
}: {
  side: ProjectSide;
  children: React.ReactNode;
}) {
  const alignClass =
    side === "left"
      ? "justify-start pl-12 md:pl-24"
      : "justify-end pr-12 md:pr-24";
  return <div className={`flex-1 flex ${alignClass}`}>{children}</div>;
}

function ModelSpacer() {
  return <div className="flex-1" aria-hidden />;
}

function buildEyebrow(oneBasedIndex: number): string {
  const padded = String(oneBasedIndex).padStart(2, "0");
  return `Project ${padded}`;
}
