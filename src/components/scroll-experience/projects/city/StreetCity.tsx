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

// Reveal-rise: each building (not debris, not the hero) waits hidden RISE_DROP
// below, then slides up on an EVEN cadence — front-to-back, radially out from
// the Building_14 anchor. Rank r of N rises once the intro reveal clock passes
// REVEAL_START + (r / (N-1)) * REVEAL_SPREAD. An even rank on a LINEAR clock
// keeps the spacing uniform; the old gate on the eased fog far-plane let its
// decelerating tail starve the outermost two, leaving them a beat behind (and
// the very farthest, past FOG_FAR-RISE_LAG, never rose at all).
const RISE_DROP = 75;
const RISE_DUR = 0.5; // seconds for the slide-up, once triggered
const RISE_BACK = 1.1; // overshoot — lifts past rest then settles
const REVEAL_START = 0.04; // nearest rises just after the fog starts clearing
const REVEAL_SPREAD = 0.62; // farthest rises at this fraction of the reveal clock

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
  /** The Building_14 hero — the radial origin the reveal ranks fan out from. */
  isAnchor: boolean;
  /** World position, for the radial reveal ranking. */
  worldPos: THREE.Vector3;
  /** Reveal-clock threshold (0..1) at which this building rises; <0 = fixed. */
  revealAt: number;
}

/** Rank the movable buildings by distance from the Building_14 anchor, then give
 *  each an even reveal-clock threshold so they rise front-to-back at a uniform
 *  cadence. Fixed pieces (hero + debris) get -1 → always shown. */
function assignRevealRanks(placed: Placed[]): Placed[] {
  const anchor = placed.find((p) => p.isAnchor)?.worldPos;
  const movable = placed.filter((p) => !p.fixed);
  if (anchor && movable.length > 0) {
    const order = [...movable].sort(
      (a, b) => a.worldPos.distanceToSquared(anchor) - b.worldPos.distanceToSquared(anchor),
    );
    const last = Math.max(1, order.length - 1);
    order.forEach((p, rank) => {
      p.revealAt = REVEAL_START + (rank / last) * REVEAL_SPREAD;
    });
  } else {
    movable.forEach((p) => (p.revealAt = REVEAL_START));
  }
  placed.forEach((p) => {
    if (p.fixed) p.revealAt = -1;
  });
  return placed;
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

    const anchored = (name: string) => /Building_14/.test(name);
    const buildingsPlaced = street.map((p) => ({ placement: p, fixed: anchored(p.item.name), anchor: anchored(p.item.name) }));
    const debrisPlaced = rubble.map((p) => ({ placement: p, fixed: true, anchor: false })); // debris never rises

    const all = [...buildingsPlaced, ...debrisPlaced].map(({ placement: p, fixed, anchor }) => ({
      object: p.item.object.clone(true),
      position: p.position,
      rotation: p.rotation,
      baseY: p.position[1],
      fixed,
      isAnchor: anchor,
      worldPos: new THREE.Vector3(p.position[0], p.position[1], p.position[2]),
      revealAt: 0,
    }));
    return assignRevealRanks(all);
  }, [scene]);

  const refs = useRef<(THREE.Group | null)[]>([]);
  const riseStart = useRef<number[]>([]); // per-building trigger time; <0 = not yet cleared

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    // Linear 0..1 reveal clock set by CityContents each frame; re-arms to 0
    // whenever the city hides, so the buildings re-bounce on scroll-back.
    const progress = (state.scene.userData.cityRevealProgress as number | undefined) ?? 0;
    for (let i = 0; i < placed.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const p = placed[i];
      if (p.fixed) {
        g.position.y = p.baseY;
        continue;
      }
      if (progress <= p.revealAt) {
        riseStart.current[i] = -1; // not yet revealed (or re-hidden on scroll-up) — wait below
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
