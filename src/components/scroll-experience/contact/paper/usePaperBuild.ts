import { useEffect, useMemo } from "react";
import { buildFoldGeometry } from "./planeFold";
import { buildPaperMaterial } from "./PaperMaterial";
import { PaperFoldController } from "./PaperFoldController";
import { PaperMeshDriver } from "./PaperMeshDriver";

export interface PaperBuild {
  geometry: ReturnType<typeof buildFoldGeometry>["geometry"];
  material: ReturnType<typeof buildPaperMaterial>;
  controller: PaperFoldController;
  driver: PaperMeshDriver;
}

/**
 * Assembles the paper's GPU + logic resources once and disposes them on unmount.
 * Kept out of the component so PaperMesh stays a thin orchestrator.
 */
export function usePaperBuild(): PaperBuild {
  const build = useMemo<PaperBuild>(() => {
    const { geometry, frames } = buildFoldGeometry();
    const material = buildPaperMaterial();
    const controller = new PaperFoldController(geometry, frames);
    const driver = new PaperMeshDriver(controller);
    return { geometry, material, controller, driver };
  }, []);

  useEffect(
    () => () => {
      build.geometry.dispose();
      build.material.dispose();
    },
    [build],
  );

  return build;
}
