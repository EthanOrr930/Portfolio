"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ProcessingResult } from "@/lib/geometry/types";

const CUBE_SIZE = 0.03;

const rotationFunctions = /* glsl */ `
  mat3 rotationMatrix(vec3 axis, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
      oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
    );
  }
`;

const vertexShader = /* glsl */ `
  ${rotationFunctions}

  attribute vec3 instanceColor;
  attribute float instanceDensity;
  attribute vec4 instanceRandom;

  uniform float u_time;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 pos = instancePos.xyz;

    // Per-instance rotation
    vec3 rotAxis = normalize(instanceRandom.xyz * 2.0 - 1.0);
    float rotSpeed = 0.3 + instanceRandom.w * 0.3;
    mat3 cubeRot = rotationMatrix(rotAxis, u_time * rotSpeed);

    vec3 finalPos = pos;

    // Depth-based scale
    vec4 mvCenter = modelViewMatrix * vec4(finalPos, 1.0);
    float depth = -mvCenter.z;
    float depthRaw = smoothstep(3.5, 1.8, depth);
    float depthScale = depthRaw * depthRaw * depthRaw;

    // Density-based scale
    float d = instanceDensity;
    float densityScale = mix(0.15, 1.0, pow(d, 0.8));

    float totalScale = 0.8 * depthScale * densityScale;

    vAlpha = depthScale;
    vColor = instanceColor;

    vec3 localPos = cubeRot * (position * ${CUBE_SIZE.toFixed(4)} * totalScale);
    vec4 mvPosition = modelViewMatrix * vec4(localPos + finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha < 0.01) discard;
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

function computeDensity(positions: Float32Array, n: number): Float32Array {
  const DENSITY_RADIUS = 0.06;
  const DENSITY_R2 = DENSITY_RADIUS * DENSITY_RADIUS;
  const cellSize = DENSITY_RADIUS;
  const grid = new Map<string, number[]>();
  const gkey = (x: number, y: number, z: number) =>
    `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;

  for (let i = 0; i < n; i++) {
    const k = gkey(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(i);
  }

  const density = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const px = positions[i * 3], py = positions[i * 3 + 1], pz = positions[i * 3 + 2];
    const cx = Math.floor(px / cellSize), cy = Math.floor(py / cellSize), cz = Math.floor(pz / cellSize);
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!cell) continue;
          for (const j of cell) {
            if (j === i) continue;
            const ddx = positions[j * 3] - px;
            const ddy = positions[j * 3 + 1] - py;
            const ddz = positions[j * 3 + 2] - pz;
            if (ddx * ddx + ddy * ddy + ddz * ddz < DENSITY_R2) count++;
          }
        }
      }
    }
    density[i] = count;
  }

  const sorted = Array.from(density).sort((a, b) => a - b);
  const median = sorted[Math.floor(n * 0.5)];
  const scaleFactor = median > 0 ? 0.5 / median : 1;
  for (let i = 0; i < n; i++) {
    density[i] = Math.min(1, density[i] * scaleFactor);
  }

  return density;
}

function ParticleCloud({ result }: { result: ProcessingResult }) {
  const { positions, colors, count: n } = result;

  const uniforms = useMemo(() => ({ u_time: { value: 0 } }), []);

  const mesh = useMemo(() => {
    const density = computeDensity(positions, n);
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const instancedMesh = new THREE.InstancedMesh(
      cubeGeo,
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        wireframe: true,
        blending: THREE.NormalBlending,
      }),
      n,
    );

    const dummy = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    let seed = 67890;
    const srand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    for (let i = 0; i < n; i++) {
      pos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      quat.setFromEuler(new THREE.Euler(srand() * Math.PI * 2, srand() * Math.PI * 2, srand() * Math.PI * 2));
      dummy.compose(pos, quat, scale);
      instancedMesh.setMatrixAt(i, dummy);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    cubeGeo.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(new Float32Array(colors), 3));
    cubeGeo.setAttribute("instanceDensity", new THREE.InstancedBufferAttribute(density, 1));

    let rseed = 12345;
    const randoms = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) {
      rseed = (rseed * 16807) % 2147483647;
      randoms[i] = rseed / 2147483647;
    }
    cubeGeo.setAttribute("instanceRandom", new THREE.InstancedBufferAttribute(randoms, 4));

    return instancedMesh;
  }, [positions, colors, n, uniforms]);

  useFrame((_, delta) => {
    uniforms.u_time.value += delta;
  });

  return <primitive object={mesh} />;
}

const bgVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;
const bgFragmentShader = `
  varying vec2 vUv;
  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center) * 1.8;
    float gradient = smoothstep(0.0, 1.0, dist);
    vec3 color = mix(vec3(0.96), vec3(0.92), gradient);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface CameraState {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
}

function CameraReporter({ onChange }: { onChange: (state: CameraState) => void }) {
  const { camera } = useThree();
  const lastRef = useRef("");

  useFrame(() => {
    const p = camera.position;
    const r = camera.rotation;
    const key = `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)},${r.x.toFixed(3)},${r.y.toFixed(3)},${r.z.toFixed(3)}`;
    if (key !== lastRef.current) {
      lastRef.current = key;
      const fov = "fov" in camera ? (camera as THREE.PerspectiveCamera).fov : 50;
      onChange({
        position: [p.x, p.y, p.z],
        rotation: [r.x, r.y, r.z],
        fov,
      });
    }
  });

  return null;
}

export function EditorPreview({
  result,
  rotation = [0, 0, 0],
  onCameraChange,
}: {
  result: ProcessingResult | null;
  rotation?: [number, number, number];
  onCameraChange?: (state: CameraState) => void;
}) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
      >
        <mesh renderOrder={-1} frustumCulled={false}>
          <planeGeometry args={[2, 2]} />
          <shaderMaterial
            vertexShader={bgVertexShader}
            fragmentShader={bgFragmentShader}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>

        {result && (
          <group rotation={rotation}>
            <ParticleCloud result={result} />
          </group>
        )}

        <OrbitControls enableDamping dampingFactor={0.1} zoomSpeed={0.1} />
        {onCameraChange && <CameraReporter onChange={onCameraChange} />}
      </Canvas>
    </div>
  );
}
