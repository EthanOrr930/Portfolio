"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { generateCity } from "./CityGenerator";
import { BuildingField } from "./BuildingField";
import { DebrisField } from "./DebrisField";

interface RuinedCityProps {
  seed?: number;
  /** Fog/background tone — matches the projects panel so the handoff is
   *  seamless. */
  fogColor?: string;
}

/**
 * Procedural low-poly ruined city. One hero building in the foreground, the
 * rest receding into fog. Scene-level concerns only (fog, lights, ground,
 * the instanced fields); the camera + canvas live with the caller.
 */
export function RuinedCity({
  seed = 1337,
  fogColor = "#e6dcca",
}: RuinedCityProps) {
  const layout = useMemo(() => generateCity(seed), [seed]);
  const allBuildings = useMemo(
    () => [...layout.buildings, layout.hero],
    [layout],
  );

  return (
    <group>
      <fog attach="fog" args={[fogColor, 24, 90]} />

      {/* Soft overcast fill — sky-tinted top, gray bounce from the rubble. */}
      <hemisphereLight args={["#f3eee4", "#6f6c66", 1.15]} />
      {/* Key light, raking from upper-left for facet definition. */}
      <directionalLight position={[-18, 26, 12]} intensity={1.5} color="#fff6e8" />
      {/* Cool fill from the opposite side to lift the shadowed faces. */}
      <directionalLight position={[20, 14, -10]} intensity={0.35} color="#cfd6e0" />

      <Ground color="#bdb9b0" />

      <BuildingField specs={allBuildings} />
      <DebrisField center={[2, 9]} radius={12} />
    </group>
  );
}

function Ground({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(300, 300);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} roughness={1} metalness={0} />
    </mesh>
  );
}
