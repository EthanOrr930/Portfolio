"use client";

import { createContext, useContext } from "react";

/**
 * True while the surrounding project is in its revealed scroll window.
 * Leaf model components read this to gate expensive per-frame effects
 * (e.g. CausticsLight) so they cost nothing while off screen.
 */
const ProjectActiveContext = createContext<boolean>(true);

export const ProjectActiveProvider = ProjectActiveContext.Provider;

export function useProjectActive(): boolean {
  return useContext(ProjectActiveContext);
}
