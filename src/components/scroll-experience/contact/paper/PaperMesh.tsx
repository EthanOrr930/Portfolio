"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import type { MouseNdc } from "../../projects/useMouseNdcRef";
import type { ContactInput } from "@/lib/contact/resendRequest";
import type { ContactPhase, PaperFoldApi } from "../contactTypes";
import { ContactForm } from "../ui/ContactForm";
import { usePaperBuild, type PaperBuild } from "./usePaperBuild";

interface PaperMeshProps {
  phase: ContactPhase;
  interactive: boolean;
  mouseNdcRef: React.RefObject<MouseNdc>;
  values: ContactInput;
  onValuesChange: (next: ContactInput) => void;
  onApi: (api: PaperFoldApi) => void;
  onFoldSettled: () => void;
  onFlightComplete: () => void;
}

// Only edges where faces meet past this angle draw (silhouette + real creases,
// not the internal triangulation).
const EDGE_THRESHOLD_DEG = 1;
const EDGE_OPACITY = 0.85;
const SENT_FADE = 0.55; // seconds for the plane to fade out as the card slides up

/** The sheet itself: flight + tilt groups, fat ink edges, and the on-paper form. */
export function PaperMesh(props: PaperMeshProps) {
  const build = usePaperBuild();
  const tiltGroup = useRef<THREE.Group>(null);
  const flightGroup = useRef<THREE.Group>(null);
  const edges = useFatEdges(build.geometry);
  const fade = useRef(0);

  useFoldApi(build, props.onApi);

  useFrame((_state, delta) => {
    if (!tiltGroup.current || !flightGroup.current) return;
    build.driver.update({
      delta: Math.min(delta, 0.05),
      phase: props.phase,
      mouse: props.mouseNdcRef.current,
      tiltGroup: tiltGroup.current,
      flightGroup: flightGroup.current,
      material: build.material,
      onFoldSettled: props.onFoldSettled,
      onFlightComplete: props.onFlightComplete,
    });
    // Refresh the crease/outline lines while the sheet folds (18 triangles → cheap).
    if (build.controller.isAnimating) edges.refresh();
    // Fade the plane out (paper + edge lines) once the message is on its way.
    fade.current = clamp01(fade.current + (props.phase === "sent" ? 1 : -1) * delta / SENT_FADE);
    applyOpacity(build.material, edges.object.material as LineMaterial, 1 - fade.current);
  });

  return (
    <group ref={flightGroup}>
      <group ref={tiltGroup}>
        <mesh geometry={build.geometry} material={build.material} />
        <primitive object={edges.object} />
        {props.phase === "filling" && (
          <ContactForm values={props.values} interactive={props.interactive} onChange={props.onValuesChange} />
        )}
      </group>
    </group>
  );
}

function applyOpacity(paper: THREE.MeshStandardMaterial, edge: LineMaterial, o: number): void {
  paper.transparent = o < 1;
  paper.opacity = o;
  edge.opacity = EDGE_OPACITY * o;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

interface FatEdges {
  object: LineSegments2;
  refresh: () => void;
}

/**
 * Width-controllable ink border + fold creases (three's Line2). Rebuilds the
 * crease set from the live geometry; the paper's outline reads as a real edge
 * even on the low-contrast cream page.
 */
function useFatEdges(geometry: THREE.BufferGeometry): FatEdges {
  const size = useThree((s) => s.size);
  const edges = useMemo<FatEdges>(() => {
    const material = new LineMaterial({
      color: 0x4a4131,
      linewidth: 2.4,
      transparent: true,
      opacity: EDGE_OPACITY,
      depthWrite: false,
    });
    const lineGeometry = new LineSegmentsGeometry();
    const object = new LineSegments2(lineGeometry, material);
    object.frustumCulled = false;
    const refresh = () => {
      const eg = new THREE.EdgesGeometry(geometry, EDGE_THRESHOLD_DEG);
      lineGeometry.setPositions(eg.attributes.position.array as Float32Array);
      eg.dispose();
    };
    refresh();
    return { object, refresh };
  }, [geometry]);

  useEffect(() => {
    (edges.object.material as LineMaterial).resolution.set(size.width, size.height);
  }, [edges, size]);

  useEffect(
    () => () => {
      edges.object.geometry.dispose();
      (edges.object.material as LineMaterial).dispose();
    },
    [edges],
  );

  return edges;
}

/** Publish the imperative fold handle upward (Send drives foldAll). */
function useFoldApi(build: PaperBuild, onApi: (a: PaperFoldApi) => void): void {
  const api = useMemo<PaperFoldApi>(
    () => ({
      foldAll: () => build.controller.foldAll(),
      reset: () => build.controller.reset(),
      getDone: () => build.controller.done,
    }),
    [build],
  );
  useEffect(() => { onApi(api); }, [api, onApi]);
}
