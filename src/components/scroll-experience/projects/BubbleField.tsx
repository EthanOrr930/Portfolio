"use client";

import type { BubbleSystem } from "./BubbleSystem";

interface BubbleFieldProps {
  /** The system whose InstancedMesh should be mounted into the scene. */
  system: BubbleSystem;
}

/**
 * Thin R3F component that mounts a BubbleSystem's InstancedMesh into the
 * scene graph. The system itself (state + step + spawn API) lives in the
 * parent so React lifecycle stays out of the hot integration path.
 */
export function BubbleField({ system }: BubbleFieldProps) {
  return <primitive object={system.mesh} />;
}
