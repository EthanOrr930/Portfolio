"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { cascadeVertexShader, RIPPLE_TRAIL_SIZE } from "../scroll-experience/shaders/cascadeVertex.glsl";
import { cascadeFragmentShader } from "../scroll-experience/shaders/cascadeFragment.glsl";

const PARTICLE_COUNT = 5526;

/** Decode EXR into positions + scales (same logic as useKeyframeLoader). */
function decodeEXR(exrData: THREE.DataTexture) {
  const exr = exrData as unknown as { image: { data: Float32Array | Uint16Array; width: number; height: number } };
  const rawData = exr.image.data;
  const n = Math.min(PARTICLE_COUNT, Math.floor(rawData.length / 4));
  const isHalfFloat = rawData instanceof Uint16Array;
  const positions = new Float32Array(n * 3);
  const scales = new Float32Array(n);
  if (isHalfFloat) {
    const buf = new ArrayBuffer(4);
    const f32 = new Float32Array(buf);
    const u32 = new Uint32Array(buf);
    const dh = (h: number) => {
      const s = (h & 0x8000) << 16; const e = (h >> 10) & 0x1f; const m = h & 0x3ff;
      if (e === 0) { if (m === 0) { u32[0] = s; return f32[0]; } let em = m; let exp = -14; while ((em & 0x400) === 0) { em <<= 1; exp--; } em &= 0x3ff; u32[0] = s | ((exp + 127) << 23) | (em << 13); return f32[0]; }
      if (e === 31) { u32[0] = s | 0x7f800000 | (m << 13); return f32[0]; }
      u32[0] = s | ((e - 15 + 127) << 23) | (m << 13); return f32[0];
    };
    for (let i = 0; i < n; i++) { const o = i * 4; positions[i*3] = dh(rawData[o]); positions[i*3+1] = dh(rawData[o+1]); positions[i*3+2] = dh(rawData[o+2]); scales[i] = dh(rawData[o+3]); }
  } else {
    for (let i = 0; i < n; i++) { const o = i * 4; positions[i*3] = rawData[o]; positions[i*3+1] = rawData[o+1]; positions[i*3+2] = rawData[o+2]; scales[i] = rawData[o+3]; }
  }
  const hasScale = scales.some((s) => s > 0);
  if (!hasScale) scales.fill(0.8);
  return { positions, scales, count: n };
}

function Particles({ exrPath, depthFar, depthNear }: { exrPath: string; depthFar: number; depthNear: number }) {
  const exrData = useLoader(EXRLoader, exrPath, (loader) => {
    loader.setDataType(THREE.FloatType);
  });
  const { size } = useThree();
  const texSize = Math.ceil(Math.sqrt(PARTICLE_COUNT));
  const decoded = useMemo(() => decodeEXR(exrData as unknown as THREE.DataTexture), [exrData]);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_aspect: { value: 1 },
      u_mouseWorld: { value: new THREE.Vector3(0, 0, 0) },
      u_texSize: { value: texSize },
      u_transitionProgress: { value: 0 },
      u_cascadeSpread: { value: 0.5 },
      u_cascadeDir: { value: new THREE.Vector2(1, 1) },
      u_rippleTrail: { value: Array.from({ length: RIPPLE_TRAIL_SIZE }, () => new THREE.Vector4(0, 0, 0, -999)) },
      u_rippleCount: { value: 0 },
      u_rippleAmplitude: { value: 0 },
      u_debugNoDepthScale: { value: false },
      u_positionEasing: { value: 0 },
      u_particleScale: { value: 0.07 },
      u_depthFarA: { value: 3.5 },
      u_depthNearA: { value: 1.8 },
      u_depthFarB: { value: 3.5 },
      u_depthNearB: { value: 1.8 },
    }),
    [texSize],
  );

  const mesh = useMemo(() => {
    const n = decoded.count;
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

    // Position/scale attributes — same data for A and B (no transition in editor preview)
    cubeGeo.setAttribute("positionA", new THREE.InstancedBufferAttribute(new Float32Array(decoded.positions), 3));
    cubeGeo.setAttribute("positionB", new THREE.InstancedBufferAttribute(new Float32Array(decoded.positions), 3));
    cubeGeo.setAttribute("scaleA", new THREE.InstancedBufferAttribute(new Float32Array(decoded.scales), 1));
    cubeGeo.setAttribute("scaleB", new THREE.InstancedBufferAttribute(new Float32Array(decoded.scales), 1));

    const indices = new Float32Array(n);
    for (let i = 0; i < n; i++) indices[i] = i;
    cubeGeo.setAttribute("instanceIndex", new THREE.InstancedBufferAttribute(indices, 1));

    const randoms = new Float32Array(n * 4);
    let seed = 12345;
    for (let i = 0; i < n * 4; i++) { seed = (seed * 16807 + 0) % 2147483647; randoms[i] = seed / 2147483647; }
    cubeGeo.setAttribute("instanceRandom", new THREE.InstancedBufferAttribute(randoms, 4));

    const instancedMesh = new THREE.InstancedMesh(
      cubeGeo,
      new THREE.ShaderMaterial({
        vertexShader: cascadeVertexShader,
        fragmentShader: cascadeFragmentShader,
        uniforms,
        transparent: true, depthWrite: false, depthTest: true, wireframe: true, blending: THREE.NormalBlending,
      }),
      n,
    );

    const dummy = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const origin = new THREE.Vector3(0, 0, 0);
    let s2 = 67890;
    const srand = () => { s2 = (s2 * 16807) % 2147483647; return s2 / 2147483647; };
    for (let i = 0; i < n; i++) {
      quat.setFromEuler(new THREE.Euler(srand() * Math.PI * 2, srand() * Math.PI * 2, srand() * Math.PI * 2));
      dummy.compose(origin, quat, scale);
      instancedMesh.setMatrixAt(i, dummy);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    return instancedMesh;
  }, [decoded, uniforms]);

  useFrame((_, delta) => {
    uniforms.u_time.value += delta;
    uniforms.u_aspect.value = size.width / size.height;
    uniforms.u_depthFarA.value = depthFar;
    uniforms.u_depthNearA.value = depthNear;
    uniforms.u_depthFarB.value = depthFar;
    uniforms.u_depthNearB.value = depthNear;
  });

  return <primitive object={mesh} />;
}

function CameraSync({ position, rotation, fov }: { position: [number, number, number]; rotation: [number, number, number]; fov: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useEffect(() => {
    camera.position.set(...position);
    camera.rotation.set(...rotation);
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, ...position, ...rotation, fov]);
  return null;
}

interface ParticlePreviewProps {
  exrPath: string;
  camera?: { position: [number, number, number]; rotation: [number, number, number]; fov: number };
  modelPosition?: [number, number, number];
  modelRotation?: [number, number, number];
  modelScale?: number;
  depthFar?: number;
  depthNear?: number;
  className?: string;
}

export function ParticlePreview({ exrPath, camera, modelPosition = [0, 0, 0], modelRotation = [0, 0, 0], modelScale = 1, depthFar = 3.5, depthNear = 1.8, className }: ParticlePreviewProps) {
  const camPos = camera?.position ?? [0, 0, 2.8];
  const camRot = camera?.rotation ?? [0, 0, 0];
  const camFov = camera?.fov ?? 50;

  return (
    <div className={className}>
      <Canvas
        key={exrPath}
        camera={{ position: camPos, fov: camFov }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
      >
        <color attach="background" args={["#f5f0eb"]} />
        <CameraSync position={camPos} rotation={camRot} fov={camFov} />
        <group position={modelPosition} rotation={modelRotation} scale={[modelScale, modelScale, modelScale]}>
          <Particles exrPath={exrPath} depthFar={depthFar} depthNear={depthNear} />
        </group>
      </Canvas>
    </div>
  );
}
