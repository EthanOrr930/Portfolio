"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * In-scene god-ray light shafts. Post-processing GodRays can't be used here
 * — this is a transparent overlay canvas and the effect's screen-space pass
 * doesn't composite over transparency. Instead we fake the shafts with a few
 * additive, soft-edged quads raking in from the upper-left, which read as
 * volumetric light and cost almost nothing.
 *
 * Each shaft is a tall plane textured with a soft horizontal+vertical
 * feather, additively blended so overlaps brighten like real light.
 */

// Dark, slightly warm — these read as shafts of *shade* raking across the
// scene. Additive light shafts are invisible on the near-white stage, so
// soft shadow bands are what actually shows here.
const SHAFT_COLOR = "#2b2620";

interface ShaftSpec {
  position: [number, number, number];
  scale: [number, number, number];
  rotationZ: number;
  opacity: number;
}

// Diagonal cluster raking in from the upper-right, in front of the cubes
// (z > cube) so the shade passes over everything like light through a
// window. Tilted ~30°.
const SHAFTS: readonly ShaftSpec[] = [
  { position: [0.2, 0, 0.8], scale: [0.9, 9, 1], rotationZ: 0.55, opacity: 0.1 },
  { position: [1.1, 0, 0.8], scale: [0.5, 9, 1], rotationZ: 0.55, opacity: 0.14 },
  { position: [1.9, 0, 0.8], scale: [1.3, 9, 1], rotationZ: 0.55, opacity: 0.07 },
  { position: [2.7, 0, 0.8], scale: [0.45, 9, 1], rotationZ: 0.55, opacity: 0.12 },
];

function buildShaftTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Soft left/right edges so the shaft has feathered sides.
    const across = ctx.createLinearGradient(0, 0, 64, 0);
    across.addColorStop(0, "rgba(255,255,255,0)");
    across.addColorStop(0.5, "rgba(255,255,255,1)");
    across.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, 64, 256);
    // Fade the top and bottom ends to nothing.
    ctx.globalCompositeOperation = "destination-out";
    const along = ctx.createLinearGradient(0, 0, 0, 256);
    along.addColorStop(0, "rgba(0,0,0,1)");
    along.addColorStop(0.4, "rgba(0,0,0,0)");
    along.addColorStop(0.6, "rgba(0,0,0,0)");
    along.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = along;
    ctx.fillRect(0, 0, 64, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

// How fast the shafts fade out once the cubes start falling. Short, so the
// atmosphere clears almost immediately as they drop into the next section.
const FALL_FADE_VH = 0.7;

interface ProjectStageFXProps {
  scrollVhRef: RefObject<number>;
  /** Scroll vh where the projects panel's reveal completes. Shafts fade in
   *  around it and fade out when scrolling back away, so they don't pop at
   *  the panel edge. */
  revealBaseVh: number;
  /** Scroll vh where the cubes start falling away — the shafts fade out from
   *  here so the atmosphere clears as the scene transitions out. */
  fallVh: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function ProjectStageFX({ scrollVhRef, revealBaseVh, fallVh }: ProjectStageFXProps) {
  const texture = useMemo(buildShaftTexture, []);
  const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useEffect(() => () => texture.dispose(), [texture]);

  // Fade the shaft group IN with scroll at the panel edge, then OUT again the
  // moment the cubes start falling — so the atmosphere doesn't linger over the
  // transition into the next section. Both ramps are scroll-based (reversible).
  useFrame(() => {
    const vh = scrollVhRef.current ?? 0;
    const reveal = smoothstep(revealBaseVh - 0.7, revealBaseVh + 0.3, vh);
    const fall = 1 - smoothstep(fallVh, fallVh + FALL_FADE_VH, vh);
    const k = reveal * fall;
    for (let i = 0; i < SHAFTS.length; i++) {
      const mat = materials.current[i];
      if (mat) mat.opacity = SHAFTS[i].opacity * k;
    }
  });

  return (
    <group>
      {SHAFTS.map((shaft, i) => (
        <mesh
          key={i}
          position={shaft.position}
          scale={shaft.scale}
          rotation={[0, 0, shaft.rotationZ]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={(el) => {
              materials.current[i] = el;
            }}
            map={texture}
            color={SHAFT_COLOR}
            transparent
            opacity={0}
            depthWrite={false}
            // Normal blend (not additive): additive can't brighten the near-
            // white stage, so a soft warm haze reads better here.
            blending={THREE.NormalBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
