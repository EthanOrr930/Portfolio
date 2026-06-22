"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import { EffectComposer, DepthOfField, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { assetUrl } from "@/lib/assets";

const MODEL_PATH = "/models/motherboard.glb";
const ENV_PATH = "/textures/motherboard-env.hdr";

// Closer + more top-down on the center chip; still showing plenty of board.
const CAMERA_POS: [number, number, number] = [2, 12, 18];
const CAMERA_TARGET = new THREE.Vector3(-6, 2, -4);
const CAMERA_FOV = 32;

// Match the main page cream.
const BG_COLOR = "#f5f0eb";
const FOG_NEAR = 35;
const FOG_FAR = 55;

useGLTF.preload(assetUrl(MODEL_PATH), true);

// Several materials rely on Blender's per-instance random (Object Info → ColorRamp),
// which doesn't survive glTF export. Rewrite them to fixed PBR values.
type Override = { color?: [number, number, number]; metalness?: number; roughness?: number };

// Only patch materials that rely on Blender's per-instance Object Info → ColorRamp,
// which doesn't survive glTF export. Gold/Silver/Motherboard export correctly — leave them alone.
const MATERIAL_OVERRIDES: Record<string, Override> = {
  "Random Black": { color: [0.018, 0.018, 0.022], metalness: 0.2, roughness: 0.45 },
  "Random Gray":  { color: [0.14, 0.14, 0.15],   metalness: 0.35, roughness: 0.4 },
};

// Blender exports these as alphaMode:BLEND, but the textures are really binary masks
// (panel shapes, text cutouts, dot patterns). Flip them to alpha-test so they render
// opaque + depth-correct — no ghosting, no flicker.
const ALPHA_MASK_MATERIALS = new Set([
  "Alpha Lines",
  "Alpha dots",
  "Alpha Planes",
  "Processor Dots",
]);

// Hide the processor text decal entirely — it glitches with the chip surface below it.
const HIDDEN_MATERIALS = new Set(["Alpha Text"]);

function applyOverrides(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std?.isMeshStandardMaterial) continue;

      if (HIDDEN_MATERIALS.has(std.name)) {
        // alphaTest > 1 discards every fragment, keeps the primitive out of the render.
        std.alphaTest = 1.1;
        std.transparent = false;
        std.depthWrite = false;
        std.colorWrite = false;
        std.needsUpdate = true;
        continue;
      }

      if (ALPHA_MASK_MATERIALS.has(std.name)) {
        std.transparent = false;
        std.depthWrite = true;
        // Antialiased alpha masks: keep anything above ~5% so the soft edges survive.
        std.alphaTest = 0.05;
        std.side = THREE.DoubleSide;
        // Push decals slightly toward the camera in the depth buffer so they
        // stop z-fighting with the surfaces they're laid on.
        std.polygonOffset = true;
        std.polygonOffsetFactor = -2;
        std.polygonOffsetUnits = -2;

        // Brighten near-black baseColorFactor so these dark chrome decals
        // actually read against the motherboard beneath. Roughness floor at 0.5
        // on the dot patterns specifically — prevents tiny specular highlights
        // from aliasing into flickering white pixels as the camera moves.
        if (std.name === "Alpha Lines" || std.name === "Alpha dots" || std.name === "Processor Dots") {
          std.color.setRGB(0.35, 0.37, 0.42);
          std.metalness = 0.9;
          std.roughness = std.name === "Alpha Lines" ? 0.35 : 0.55;
          std.envMapIntensity = 1.6;
        }

        std.needsUpdate = true;
      }

      // Glass in the processor exports with KHR_materials_transmission=1 (refraction).
      // Expensive + flickers with DoF; force it opaque and render as polished gold
      // so the chip reads as a shiny gold cap with HDRI reflections.
      if (std.name === "Glass") {
        const phys = std as THREE.MeshPhysicalMaterial;
        if ("transmission" in phys) phys.transmission = 0;
        if ("thickness" in phys) phys.thickness = 0;
        std.transparent = false;
        std.depthWrite = true;
        std.color.setRGB(1.0, 0.72, 0.28);
        std.metalness = 1.0;
        std.roughness = 0.06;
        std.envMapIntensity = 10.0;
        std.needsUpdate = true;
      }

      const override = MATERIAL_OVERRIDES[std.name];
      if (!override) continue;
      if (override.color) {
        const [r, g, b] = override.color;
        std.color.setRGB(r, g, b);
      }
      if (override.metalness !== undefined) std.metalness = override.metalness;
      if (override.roughness !== undefined) std.roughness = override.roughness;
      std.needsUpdate = true;
    }
  });
}

function Motherboard() {
  const { scene } = useGLTF(assetUrl(MODEL_PATH), true);
  // Patch synchronously before first render so the text decal never flashes.
  const patched = useRef(new WeakSet<THREE.Object3D>());
  if (!patched.current.has(scene)) {
    applyOverrides(scene);
    patched.current.add(scene);
  }
  return <primitive object={scene} />;
}

function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const smoothed = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = CAMERA_FOV;
      // Push near plane out — closest point we ever see is ~8 units from the camera,
      // so 2.0 is safe. This massively improves depth-buffer precision at the far
      // end and kills most of the residual z-fight flicker on coplanar decals.
      camera.near = 2.0;
      camera.far = 200;
      camera.updateProjectionMatrix();
    }
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [camera]);

  const base = useRef(new THREE.Vector3(...CAMERA_POS));

  useFrame(() => {
    smoothed.current.x += (mouse.current.x - smoothed.current.x) * 0.06;
    smoothed.current.y += (mouse.current.y - smoothed.current.y) * 0.06;
    const offset = new THREE.Vector3(
      -smoothed.current.x * 1.8,
      smoothed.current.y * 1.2,
      0,
    );
    camera.position.copy(base.current).add(offset);
    camera.lookAt(CAMERA_TARGET);
  });

  return null;
}

export default function CircuitBoardScene() {
  return (
    <Canvas
      camera={{ position: CAMERA_POS, fov: CAMERA_FOV, near: 2.0, far: 200 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        logarithmicDepthBuffer: true,
        powerPreference: "high-performance",
      }}
    >
      <color attach="background" args={[BG_COLOR]} />
      <fog attach="fog" args={[BG_COLOR, FOG_NEAR, FOG_FAR]} />

      {/* single tight golden spot from above — creates one bright channel, rest stays dim */}
      <spotLight
        position={[4, 30, 6]}
        target-position={[-2.5, 0, 0]}
        angle={0.35}
        penumbra={0.55}
        intensity={180}
        distance={60}
        decay={1.6}
        color="#ffb060"
      />

      <Suspense fallback={null}>
        <Environment
          files={assetUrl(ENV_PATH)}
          environmentIntensity={0.35}
          environmentRotation={[0, Math.PI, 0]}
        />
        <Motherboard />
      </Suspense>

      <CameraRig />

      <EffectComposer multisampling={0}>
        <DepthOfField
          worldFocusDistance={20}
          worldFocusRange={20}
          bokehScale={4}
        />
        <Bloom
          intensity={0.28}
          luminanceThreshold={0.85}
          luminanceSmoothing={0.2}
        />
        <Vignette offset={0.3} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    </Canvas>
  );
}
