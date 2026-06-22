"use client";

import { useEffect, useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "../motionTokens";
import { CausticsLight } from "./CausticsLight";
import { useProjectActive } from "./ProjectActiveContext";

/**
 * Placeholder mesh for the Hydro Cube project. A single matte ceramic
 * cube at local (0,0,0) with unit size — ProjectModelGroups instantiates
 * this component twice, once per independent physics body, and each
 * instance's outer group handles scale + world position.
 *
 * Animated ocean caustics are projected onto the top faces via CausticsLight,
 * and only processed while the project is in its revealed scroll window.
 * Swap for the real GLB once the product model ships.
 */
export function HydroCubePlaceholder() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const active = useProjectActive();
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const caustics = useMemo(
    () => new CausticsLight({ freeze: reducedMotion }),
    [reducedMotion],
  );

  useEffect(() => {
    if (materialRef.current) caustics.attach(materialRef.current);
  }, [caustics]);

  useFrame((_, delta) => {
    caustics.update(delta, meshRef.current, active);
  });

  return (
    <RoundedBox ref={meshRef} args={[1, 1, 1]} radius={0.06} smoothness={4}>
      <meshStandardMaterial
        ref={materialRef}
        color="#f3ede1"
        roughness={0.62}
        metalness={0.04}
      />
    </RoundedBox>
  );
}
