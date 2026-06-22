"use client";

import { useMemo } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform vec3 colorCenter;
  uniform vec3 colorEdge;

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center) * 1.8;
    float gradient = smoothstep(0.0, 1.0, dist);
    vec3 color = mix(colorCenter, colorEdge, gradient);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function BackgroundGradient() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          colorCenter: { value: new THREE.Color("#f5f0eb") },
          colorEdge: { value: new THREE.Color("#e8e0d8") },
        },
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
