"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { createNoise3D } from "simplex-noise";
import { assetUrl } from "@/lib/assets";
import type { TransformState } from "./types";

const CUBE_SIZE = 0.03;
const POSITION_COUNT = 9407;

// ── Noise color constants ───────────────────────────────────────────
const NOISE_FREQ = 1.0;
const NOISE_OFFSETS = [0, 100, 200];
const COLOR_MIN = 0.25;
const COLOR_MAX = 0.55;

// ── Rotation matrix helper ──────────────────────────────────────────
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

const instanceVertexShader = /* glsl */ `
  ${rotationFunctions}

  attribute vec3 instanceColor;
  attribute vec4 instanceRandom;
  attribute float instanceScale;

  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_aspect;
  uniform vec3 u_mouseWorld;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vHover;

  void main() {
    // Get instance center in model space
    vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 pos = instancePos.xyz;

    // ── Per-instance rotation from baked random values ──────
    // Each cube gets a unique axis and speed from instanceRandom (seeded, consistent)
    vec3 rotAxis = normalize(instanceRandom.xyz * 2.0 - 1.0);
    float rotSpeed = 0.3 + instanceRandom.w * 0.3; // 0.3 to 0.6
    mat3 cubeRot = rotationMatrix(rotAxis, u_time * rotSpeed);

    // ── Floating drift: position-seeded phase → clustered motion ──
    // Phase is mostly a function of position, so neighbouring particles
    // share a phase and drift together as clusters. A small per-instance
    // offset desyncs them just enough to feel alive, not rigid.
    float phaseA = dot(pos, vec3(1.6, 0.9, 1.3));
    float phaseB = dot(pos, vec3(-1.1, 1.4, 0.7));
    float desync = instanceRandom.x * 1.2;

    vec3 drift = vec3(
      sin(u_time * 0.34 + phaseA + desync),
      sin(u_time * 0.29 + phaseB + desync * 0.8),
      sin(u_time * 0.39 + phaseA * 0.6 + desync)
    ) * 0.022;

    // ── Compose final transform ─────────────────────────────
    vec3 finalPos = pos + drift;

    // ── Depth-based scale: fade to 0 for back-facing cubes ──
    vec4 mvCenter = modelViewMatrix * vec4(finalPos, 1.0);
    float depth = -mvCenter.z;

    float depthRaw = smoothstep(3.5, 1.8, depth); // kicks in a bit sooner
    float depthScale = depthRaw * depthRaw * depthRaw;

    // Perspective correction: scale world size with depth so each particle
    // subtends a constant pixel size on screen (reference depth ~ model center).
    float perspectiveScale = depth / 2.5;

    // Baked base scale from EXR (includes density)
    float totalScale = instanceScale * depthScale * perspectiveScale;

    vAlpha = depthScale;
    vColor = instanceColor;
    vHover = 0.0;

    vec3 localPos = cubeRot * (position * ${CUBE_SIZE.toFixed(4)} * totalScale);
    vec4 mvPosition = modelViewMatrix * vec4(localPos + finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const instanceFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vHover;

  void main() {
    if (vAlpha < 0.01) discard;

    // Brighten particles near mouse
    vec3 col = mix(vColor, vec3(1.0), vHover * 0.4);

    gl_FragColor = vec4(col, vAlpha);
  }
`;

/** Download positions as a .bin file (float32 XYZ triples) */
export function downloadPositions(positions: Float32Array, count: number) {
  const buffer = positions.slice(0, count * 3);
  const blob = new Blob([buffer.buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `positions_${count}.bin`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Decode positions from the EXR texture data and build particle data.
 */
function buildFromTexture(exrData: THREE.DataTexture) {
  const exr = exrData as unknown as { image: { data: Float32Array | Uint16Array; width: number; height: number } };
  const rawData = exr.image.data;
  const n = Math.min(POSITION_COUNT, Math.floor(rawData.length / 4));

  // Handle both Float32Array and Uint16Array (half-float) from EXRLoader
  const isHalfFloat = rawData instanceof Uint16Array;

  // Extract positions (RGB = XYZ) and baked scale (A) from EXR
  const positions = new Float32Array(n * 3);
  const scales = new Float32Array(n);
  if (isHalfFloat) {
    const buf = new ArrayBuffer(4);
    const f32 = new Float32Array(buf);
    const u32 = new Uint32Array(buf);
    const decodeHalf = (h: number) => {
      const s = (h & 0x8000) << 16;
      const e = (h >> 10) & 0x1f;
      const m = h & 0x3ff;
      if (e === 0) {
        if (m === 0) { u32[0] = s; return f32[0]; }
        let em = m;
        let exp = -14;
        while ((em & 0x400) === 0) { em <<= 1; exp--; }
        em &= 0x3ff;
        u32[0] = s | ((exp + 127) << 23) | (em << 13);
        return f32[0];
      }
      if (e === 31) { u32[0] = s | 0x7f800000 | (m << 13); return f32[0]; }
      u32[0] = s | ((e - 15 + 127) << 23) | (m << 13);
      return f32[0];
    };
    for (let i = 0; i < n; i++) {
      const off = i * 4;
      positions[i * 3] = decodeHalf(rawData[off]);
      positions[i * 3 + 1] = decodeHalf(rawData[off + 1]);
      positions[i * 3 + 2] = decodeHalf(rawData[off + 2]);
      scales[i] = decodeHalf(rawData[off + 3]);
    }
  } else {
    for (let i = 0; i < n; i++) {
      const off = i * 4;
      positions[i * 3] = rawData[off];
      positions[i * 3 + 1] = rawData[off + 1];
      positions[i * 3 + 2] = rawData[off + 2];
      scales[i] = rawData[off + 3];
    }
  }

  // If scale is all zeros (old format without baked scale), default to 0.8
  const hasScale = scales.some((s) => s > 0);
  if (!hasScale) {
    scales.fill(0.8);
  }

  // Assign noise colors based on position
  const noise3D = createNoise3D();
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    for (let c = 0; c < 3; c++) {
      const off = NOISE_OFFSETS[c];
      const raw = noise3D(
        x * NOISE_FREQ + off,
        y * NOISE_FREQ + off,
        z * NOISE_FREQ + off,
      );
      colors[i * 3 + c] = COLOR_MIN + ((raw + 1) / 2) * (COLOR_MAX - COLOR_MIN);
    }
  }

  return { positions, colors, scales, count: n };
}

export function BrainWireframe({
  transform,
}: {
  transform: React.RefObject<TransformState>;
}) {
  const exrData = useLoader(EXRLoader, assetUrl("/textures/positions.exr"), (loader) => {
    loader.setDataType(THREE.FloatType);
  });
  const groupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const mousePrevRef = useRef(new THREE.Vector2(0, 0));
  const mouseTargetRef = useRef(new THREE.Vector2(0, 0));
  const mouseDeltaRef = useRef(new THREE.Vector2(0, 0));
  const raycaster = useRef(new THREE.Raycaster());
  const { size, camera } = useThree();

  const particleData = useMemo(
    () => buildFromTexture(exrData as unknown as THREE.DataTexture),
    [exrData],
  );

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_mouseDelta: { value: new THREE.Vector2(0, 0) },
      u_aspect: { value: 1 },
      u_mouseWorld: { value: new THREE.Vector3(0, 0, 0) },
    }),
    [],
  );

  const mesh = useMemo(() => {
    const { positions, colors, scales, count: n } = particleData;
    if (n === 0) return null;

    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const instancedMesh = new THREE.InstancedMesh(
      cubeGeo,
      new THREE.ShaderMaterial({
        vertexShader: instanceVertexShader,
        fragmentShader: instanceFragmentShader,
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
    // Seeded initial orientations
    let s2 = 67890;
    const srand = () => { s2 = (s2 * 16807) % 2147483647; return s2 / 2147483647; };
    for (let i = 0; i < n; i++) {
      pos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      quat.setFromEuler(new THREE.Euler(
        srand() * Math.PI * 2,
        srand() * Math.PI * 2,
        srand() * Math.PI * 2,
      ));
      dummy.compose(pos, quat, scale);
      instancedMesh.setMatrixAt(i, dummy);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    cubeGeo.setAttribute(
      "instanceColor",
      new THREE.InstancedBufferAttribute(new Float32Array(colors), 3),
    );
    cubeGeo.setAttribute(
      "instanceScale",
      new THREE.InstancedBufferAttribute(new Float32Array(scales), 1),
    );

    // Seeded random values — consistent across page loads
    const randoms = new Float32Array(n * 4);
    let seed = 12345;
    for (let i = 0; i < n * 4; i++) {
      seed = (seed * 16807 + 0) % 2147483647;
      randoms[i] = seed / 2147483647;
    }
    cubeGeo.setAttribute(
      "instanceRandom",
      new THREE.InstancedBufferAttribute(randoms, 4),
    );

    return instancedMesh;
  }, [particleData, uniforms]);

  // Mouse tracking
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseTargetRef.current.set(
        (e.clientX / size.width) * 2 - 1,
        -(e.clientY / size.height) * 2 + 1,
      );
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [size]);

  useFrame((_, delta) => {
    if (groupRef.current && transform.current) {
      const tf = transform.current;
      groupRef.current.position.set(...tf.position);
      groupRef.current.rotation.set(...tf.rotation);
      groupRef.current.scale.setScalar(tf.scale);
    }

    const lerpFactor = 1 - Math.pow(1 - 0.075, delta * 60);
    mouseRef.current.lerp(mouseTargetRef.current, lerpFactor);

    mouseDeltaRef.current.set(
      THREE.MathUtils.clamp(mouseRef.current.x - mousePrevRef.current.x, -2, 2),
      THREE.MathUtils.clamp(mouseRef.current.y - mousePrevRef.current.y, -2, 2),
    );
    mousePrevRef.current.copy(mouseRef.current);

    uniforms.u_time.value += delta;
    uniforms.u_mouse.value.copy(mouseRef.current);
    uniforms.u_mouseDelta.value.copy(mouseDeltaRef.current);
    uniforms.u_aspect.value = size.width / size.height;

    // Unproject mouse into group-local space
    raycaster.current.setFromCamera(mouseRef.current, camera);
    const ray = raycaster.current.ray;
    const groupInverse = new THREE.Matrix4();
    if (groupRef.current) {
      groupInverse.copy(groupRef.current.matrixWorld).invert();
    }
    const localOrigin = ray.origin.clone().applyMatrix4(groupInverse);
    const localDir = ray.direction.clone().transformDirection(groupInverse).normalize();
    const t = -localOrigin.z / localDir.z;
    if (t > 0) {
      const hit = localOrigin.clone().addScaledVector(localDir, t);
      uniforms.u_mouseWorld.value.lerp(hit, lerpFactor);
    }
  });

  return (
    <group ref={groupRef}>
      {mesh && <primitive object={mesh} />}
    </group>
  );
}
