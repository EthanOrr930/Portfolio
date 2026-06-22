"use client";

import { EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export function PostProcessing() {
  return (
    <EffectComposer multisampling={4}>
      <Vignette
        offset={0.5}
        darkness={0.25}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
