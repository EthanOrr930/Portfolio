"use client";

import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { SWITCH_ANCHOR } from "./recorderConstants";

interface PowerSwitchProps {
  on: boolean;
  onToggle: () => void;
}

const HALF = SWITCH_ANCHOR.travel / 2;

/**
 * Slide power switch on the right side face. The nub slides between two
 * positions (down = OFF, up = ON); clicking it toggles. Lives in device-local
 * space, mounted as a child of the recorder model.
 */
export function PowerSwitch({ on, onToggle }: PowerSwitchProps) {
  const nub = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (!nub.current) return;
    const target = on ? HALF : -HALF;
    nub.current.position.y += (target - nub.current.position.y) * Math.min(1, dt * 14);
  });

  const toggle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <group position={SWITCH_ANCHOR.pos} onClick={toggle}>
      {/* generous transparent hit area (opacity 0 still raycasts) */}
      <mesh position={[2, 0, 0]}>
        <boxGeometry args={[6, 9, 7]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* long dark slide track seated in the side hole */}
      <mesh position={[-0.6, 0, 0]}>
        <boxGeometry args={[1.4, SWITCH_ANCHOR.trackLength, 5.6]} />
        <meshStandardMaterial color="#141619" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* sliding nub, just proud of the side surface on +X */}
      <mesh ref={nub} position={[0.5, on ? HALF : -HALF, 0]}>
        <boxGeometry args={[1.7, 2.6, 4.2]} />
        <meshStandardMaterial color="#d8dadf" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}
