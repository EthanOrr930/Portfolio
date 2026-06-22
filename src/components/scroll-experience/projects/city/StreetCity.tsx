"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  collectItems,
  layoutStreet,
  layoutDebris,
  streetLength,
} from "./streetLayout";

const CITY_GLTF = "/models/destroyed-city/Destroyed_City.gltf";

// Same matte ceramic as the hydro cubes — no textures.
const CITY_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#f3ede1",
  roughness: 0.62,
  metalness: 0.04,
});

// Reveal-rise: each building (not debris, not the hero) waits hidden this far
// below, then slides up — but ONLY once the fog's far plane has swept RISE_LAG
// units past it (so it emerges after the fog has cleared its spot). The rise
// then plays over RISE_DUR seconds, decoupled from the fog speed so the slide
// is always visible.
const RISE_DROP = 75;
const RISE_LAG = 10; // fog must clear the building by this many units first
const RISE_DUR = 0.5; // seconds for the slide-up, once triggered
const RISE_BACK = 1.1; // overshoot — lifts past rest then settles

/** Ease-out-back: overshoots above 1 near the end, settles to exactly 1. */
function easeOutBack(x: number, s = RISE_BACK): number {
  const c3 = s + 1;
  const xm = x - 1;
  return 1 + c3 * xm * xm * xm + s * xm * xm;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

interface Placed {
  object: THREE.Object3D;
  position: [number, number, number];
  rotation: [number, number, number];
  baseY: number;
  /** Hero or debris — never rises, always at base. */
  fixed: boolean;
  /** World position, for the camera-distance vs fog-far test. */
  worldPos: THREE.Vector3;
}

/**
 * Buildings recomposed into a street receding into -Z, Building_14 anchored
 * front-left. Every piece except the hero stays hidden below until the receding
 * fog uncovers its spot, then slides up into place — so the city assembles
 * front-to-back behind the fog's inner edge.
 */
export function StreetCity() {
  const { scene } = useGLTF(CITY_GLTF);

  const placed = useMemo<Placed[]>(() => {
    const buildings = collectItems(scene, /^Building/, CITY_MATERIAL);
    const street = layoutStreet(buildings);
    const debris = collectItems(scene, /^Debris/, CITY_MATERIAL);
    const rubble = layoutDebris(debris, streetLength(street));

    const buildingsPlaced = street.map((p) => ({ placement: p, fixed: /Building_14/.test(p.item.name) }));
    const debrisPlaced = rubble.map((p) => ({ placement: p, fixed: true })); // debris never rises

    return [...buildingsPlaced, ...debrisPlaced].map(({ placement: p, fixed }) => ({
      object: p.item.object.clone(true),
      position: p.position,
      rotation: p.rotation,
      baseY: p.position[1],
      fixed,
      worldPos: new THREE.Vector3(p.position[0], p.position[1], p.position[2]),
    }));
  }, [scene]);

  const refs = useRef<(THREE.Group | null)[]>([]);
  const riseStart = useRef<number[]>([]); // per-building trigger time; <0 = not yet cleared

  useFrame((state) => {
    const fog = state.scene.fog as THREE.Fog | null;
    const now = state.clock.elapsedTime;
    const cam = state.camera.position;
    for (let i = 0; i < placed.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const p = placed[i];
      if (p.fixed || !fog) {
        g.position.y = p.baseY;
        continue;
      }
      const dist = cam.distanceTo(p.worldPos);
      if (fog.far <= dist + RISE_LAG) {
        riseStart.current[i] = -1; // still fogged (or re-fogged on scroll-up) — wait below
        g.position.y = p.baseY - RISE_DROP;
        continue;
      }
      const begun = riseStart.current[i] >= 0 ? riseStart.current[i] : (riseStart.current[i] = now);
      const rise = clamp01((now - begun) / RISE_DUR);
      g.position.y = p.baseY - (1 - easeOutBack(rise)) * RISE_DROP;
    }
  });

  return (
    <group>
      {placed.map((p, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={p.position}
          rotation={p.rotation}
        >
          <primitive object={p.object} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(CITY_GLTF);
