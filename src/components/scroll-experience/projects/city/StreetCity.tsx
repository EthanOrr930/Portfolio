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

// Reveal-rise: buildings (not debris, not the hero) start this far below and
// rise into place, staggered by radial distance from Building_14 — closest
// rises first — as `revealRef` goes 0 → 1.
const RISE_DROP = 75;
const RISE_DUR = 0.35;
const RISE_STAGGER_MAX = 0.65;
// Overshoot strength for the rise — the building lifts a touch past its
// resting height, then settles back, so the arrival reads springy not sticky.
const RISE_BACK = 1.1;

/** Ease-out-back: overshoots above 1 near the end, settles to exactly 1. */
function easeOutBack(x: number, s = RISE_BACK): number {
  const c3 = s + 1;
  const xm = x - 1;
  return 1 + c3 * xm * xm * xm + s * xm * xm;
}

interface Placed {
  object: THREE.Object3D;
  position: [number, number, number];
  rotation: [number, number, number];
  baseY: number;
  /** Hero or debris — never rises, always at base. */
  fixed: boolean;
  delay: number;
}

interface StreetCityProps {
  /** 0 → 1 reveal; non-hero pieces rise into place. Omit for fully-placed. */
  revealRef?: React.RefObject<number>;
}

/**
 * Buildings recomposed into a street receding into -Z, Building_14 anchored
 * front-left. When `revealRef` is supplied, every piece except the hero
 * building rises up into place (staggered) so the city assembles during the
 * camera fly-in.
 */
export function StreetCity({ revealRef }: StreetCityProps) {
  const { scene } = useGLTF(CITY_GLTF);

  const placed = useMemo<Placed[]>(() => {
    const buildings = collectItems(scene, /^Building/, CITY_MATERIAL);
    const street = layoutStreet(buildings);
    const debris = collectItems(scene, /^Debris/, CITY_MATERIAL);
    const rubble = layoutDebris(debris, streetLength(street));

    const hero = street.find((p) => /Building_14/.test(p.item.name));
    const hx = hero ? hero.position[0] : 0;
    const hz = hero ? hero.position[2] : 0;
    const radial = (p: { position: [number, number, number] }) =>
      Math.hypot(p.position[0] - hx, p.position[2] - hz);
    const maxDist = Math.max(...street.map(radial), 1);

    const buildingsPlaced = street.map((p) => ({
      placement: p,
      fixed: /Building_14/.test(p.item.name),
      // Closest to the hero rises first.
      delay: (radial(p) / maxDist) * RISE_STAGGER_MAX,
    }));
    const debrisPlaced = rubble.map((p) => ({
      placement: p,
      fixed: true, // debris never rises
      delay: 0,
    }));

    return [...buildingsPlaced, ...debrisPlaced].map(({ placement: p, fixed, delay }) => ({
      object: p.item.object.clone(true),
      position: p.position,
      rotation: p.rotation,
      baseY: p.position[1],
      fixed,
      delay,
    }));
  }, [scene]);

  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    if (!revealRef) return; // fully placed when no reveal driver
    const reveal = revealRef.current ?? 1;
    for (let i = 0; i < placed.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const p = placed[i];
      if (p.fixed) {
        g.position.y = p.baseY;
        continue;
      }
      const local = Math.min(1, Math.max(0, (reveal - p.delay) / RISE_DUR));
      g.position.y = p.baseY - (1 - easeOutBack(local)) * RISE_DROP;
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
