"use client";

import { Canvas } from "@react-three/fiber";
import type { RefObject } from "react";
import type { MouseNdc } from "../projects/useMouseNdcRef";
import type { ContactInput } from "@/lib/contact/resendRequest";
import type { ContactPhase, PaperFoldApi } from "./contactTypes";
import { PaperMesh } from "./paper/PaperMesh";

interface ContactStageProps {
  phase: ContactPhase;
  interactive: boolean;
  mouseNdcRef: RefObject<MouseNdc>;
  values: ContactInput;
  onValuesChange: (next: ContactInput) => void;
  onApi: (api: PaperFoldApi) => void;
  onFoldSettled: () => void;
  onFlightComplete: () => void;
}

/** The R3F canvas for the contact paper — warm cream lighting, transparent bg. */
export function ContactStage(props: ContactStageProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.4], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <hemisphereLight args={["#fffaf2", "#8a8170", 0.75]} />
      <directionalLight position={[-5, 7, 6]} intensity={2.1} color="#fff6e8" />
      <directionalLight position={[6, 1, 4]} intensity={0.55} color="#dfe6f0" />
      {/* Back/rim light so the paper's far edges catch light and pop off the bg. */}
      <directionalLight position={[1, -2, -7]} intensity={0.9} color="#fff3e2" />
      {/* Sit the sheet on the right so it clears the left contact column;
          centred vertically + slightly smaller so it never clips top/bottom. */}
      <group position={[1.1, 0, 0]} scale={0.96}>
        <PaperMesh {...props} />
      </group>
    </Canvas>
  );
}
