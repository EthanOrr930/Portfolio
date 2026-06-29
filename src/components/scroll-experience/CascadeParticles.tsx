"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCascadeInstance } from "./cascade/useCascadeInstance";
import { useMouseTracker } from "./cascade/useMouseTracker";
import type { CascadeParticlesProps } from "./cascade/types";

export type { CascadeState, DecodedKeyframe } from "./cascade/types";
export { PARTICLE_COUNT } from "./cascade/types";
export { cascadeOriginToDir } from "./cascade/cascadeOrigin";

/**
 * Renders the scroll-driven particle cascade. Orchestration only — all the
 * heavy lifting (mesh construction, keyframe buffers, uniform sync, physics)
 * lives in sibling classes under ./cascade/.
 */
export function CascadeParticles({
  cascadeState,
  debugNoDepthScale = false,
}: CascadeParticlesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const instance = useCascadeInstance();

  useMouseTracker(instance.tracker);

  useFrame((_, delta) => {
    const cs = cascadeState.current;
    if (!cs) return;

    // One-shot load intro: fly the particles in from an outward scatter while
    // the whole cloud sheds a slight clockwise Y-spin. Both settle to a no-op
    // (introProgress→1, spin→0), leaving scroll/fall behaviour untouched.
    instance.intro.advance(delta);
    if (groupRef.current) groupRef.current.rotation.y = instance.intro.spinAngle;

    instance.bufferWriter.writeIfChanged(cs, instance.bundle.attrs);
    instance.uniformsSync.sync(cs, delta, debugNoDepthScale);
    instance.uniformsSync.setIntroProgress(instance.intro.flyIn);
    instance.physics.step(
      cs,
      {
        bundle: instance.bundle,
        resolver: instance.resolver,
        field: instance.field,
        tracker: instance.tracker,
        camera,
      },
      delta,
      instance.uniformsSync.falloffDistance,
    );
  });

  return (
    <group ref={groupRef}>
      <primitive object={instance.bundle.mesh} />
    </group>
  );
}
