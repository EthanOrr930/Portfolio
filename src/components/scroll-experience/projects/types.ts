import type { ComponentType } from "react";

export type ProjectSide = "left" | "right";

/**
 * One project slot. `side` is derived from array index at render time
 * (even = left, odd = right), so data entries don't encode it — adding
 * a project is a single-object append.
 *
 * `Model` renders the bare mesh inside the shared ProjectModelStage, which
 * supplies camera, lighting, slide-in group, and mouse-push group.
 */
export interface Project {
  id: string;
  title: string;
  /** Scannable device notes — rendered as the shared em-dash bullet list. */
  bullets: string[];
  Model: ComponentType;
}

export function sideForIndex(index: number): ProjectSide {
  return index % 2 === 0 ? "left" : "right";
}
