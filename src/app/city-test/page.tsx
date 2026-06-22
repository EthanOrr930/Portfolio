"use client";

// TEMP dev harness (owner: ethan, 2026-06) for the street scene + posed
// character/gun + scroll-driven muzzle projectile, before wiring into project
// 2's scroll cinematic. Locked camera; flat bg matched to fog.

import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { StreetCity } from "@/components/scroll-experience/projects/city/StreetCity";
import { VoxelModel } from "@/components/voxel/VoxelModel";

const SKY = "#f4efe7";
const FOG_NEAR = 17;
const FOG_FAR = 203;

const CAM_POS: [number, number, number] = [-22.91, 56.44, 22.32];
const CAM_ROT: [number, number, number] = [-0.39, -0.28, -0.1];

const MODEL_SCALE = 0.2;
const CHAR_POS: [number, number, number] = [-22.76, 41.02, -10.88];
const CHAR_ROT: [number, number, number] = [-3.14, 1.22, -3.14];
const GUN_POS: [number, number, number] = [-18.99, 44.03, -10.36];
const GUN_ROT: [number, number, number] = [-2.74, 0.88, 2.56];

// Projectile scroll windows (in vh = scrollY / innerHeight).
const FIRE_START = 1.0; // emerges from the muzzle
const OUT_END = 2.2; // burst out (~½ the old speed)
const SLOW_END = 4.8; // slow-mo creep, lingering ~8 units out
const GONE = 8.0; // accelerates off into the distance
const FAR = 160; // travel distance (~½ speed)
const SPIN_PER_VH = 2.5; // scroll-driven spin: rad per vh of scroll velocity
const IDLE_SPIN = 0.7; // rad/s slow idle spin when not scrolling
const START_OFFSET = 0.85; // push bolt's back face to the nozzle tip (no clip)
const FLASH_END = FIRE_START + 0.4; // muzzle-flash duration (vh)
const BOB_AMP = 0.25; // gun breathing bob amplitude (~¼ unit)
const BOB_SPEED = 0.8; // rad/s — slow, breathing pace
const SPACER_VH = 1000; // page scroll height

export default function CityTestPage() {
  const scrollVh = useRef(0);
  const [gunObj, setGunObj] = useState<THREE.Object3D | null>(null);
  const muzzleRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    const onScroll = () => {
      scrollVh.current = window.scrollY / window.innerHeight;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* scroll spacer — the canvas is fixed; scrolling drives the projectile */}
      <div style={{ height: `${SPACER_VH}vh` }} />
      <div style={{ position: "fixed", inset: 0, background: SKY }}>
        <Canvas
          camera={{ position: CAM_POS, fov: 40, far: 6000 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          onCreated={({ camera }) => camera.rotation.set(...CAM_ROT)}
          style={{ background: "transparent" }}
        >
          <fog attach="fog" args={[SKY, FOG_NEAR, FOG_FAR]} />
          <hemisphereLight args={["#f3eee4", "#6f6c66", 1.1]} />
          <directionalLight position={[-60, 90, 50]} intensity={1.6} color="#fff6e8" />
          <directionalLight position={[60, 50, -30]} intensity={0.4} color="#cfd6e0" />

          <Ground />
          <ModelBoundary>
            <Suspense fallback={null}>
              <StreetCity />
              <VoxelModel
                url="/models/voxel-character.json"
                scale={MODEL_SCALE}
                position={CHAR_POS}
                rotation={CHAR_ROT}
              />
              <VoxelModel
                ref={setGunObj}
                url="/models/voxel-gun.json"
                scale={MODEL_SCALE}
                position={GUN_POS}
                rotation={GUN_ROT}
                muzzleAnchorRef={muzzleRef}
              />
            </Suspense>
          </ModelBoundary>

          <Projectile gun={gunObj} muzzleRef={muzzleRef} scrollVh={scrollVh} />
        </Canvas>
      </div>
    </>
  );
}

const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _spin = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);

/** The bolt fired from the muzzle, driven by scroll: emerges, hangs near the
 *  barrel for a few vh, then accelerates off into the distance. */
function Projectile({
  gun,
  muzzleRef,
  scrollVh,
}: {
  gun: THREE.Object3D | null;
  muzzleRef: React.RefObject<THREE.Object3D | null>;
  scrollVh: React.RefObject<number>;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const spinState = useRef({ angle: 0, vel: 0, lastVh: 0 });

  useFrame((state, dt) => {
    const mesh = ref.current;
    const flash = flashRef.current;
    const muzzle = muzzleRef.current;
    if (!gun || !muzzle) return;
    const vh = scrollVh.current;

    // Time-based breathing bob (slow, ~¼ unit), then refresh world matrices so
    // the muzzle anchor follows the gun.
    const bob = Math.sin(state.clock.elapsedTime * BOB_SPEED) * BOB_AMP;
    gun.position.y = GUN_POS[1] + bob;
    gun.updateMatrixWorld(true);
    muzzle.getWorldPosition(_pos);
    gun.getWorldQuaternion(_quat);
    _dir.set(0, 0, 1).applyQuaternion(_quat).normalize();

    // Spin: scroll-velocity drives it; when you stop, a time-based idle takes
    // over, easing from your last scroll spin down to a faint constant spin.
    const dts = Math.max(dt, 1e-4);
    const scrollVel = (vh - spinState.current.lastVh) / dts;
    spinState.current.lastVh = vh;
    const target =
      Math.abs(scrollVel) > 0.03 ? scrollVel * SPIN_PER_VH : IDLE_SPIN;
    spinState.current.vel += (target - spinState.current.vel) * Math.min(1, dt * 3);
    spinState.current.angle += spinState.current.vel * dt;

    // Muzzle flash — quick additive pop as the bolt leaves the barrel.
    if (flash) {
      const on = vh >= FIRE_START && vh < FLASH_END;
      flash.visible = on;
      if (on) {
        const k = 1 - (vh - FIRE_START) / (FLASH_END - FIRE_START);
        flash.position.copy(_pos).addScaledVector(_dir, 0.3);
        flash.scale.setScalar(0.35 + k * 1.3);
        (flash.material as THREE.MeshBasicMaterial).opacity = k * 0.95;
      }
    }

    if (!mesh) return;
    let dist = 0;
    let visible = true;
    if (vh < FIRE_START) {
      visible = false;
    } else if (vh < OUT_END) {
      const t = (vh - FIRE_START) / (OUT_END - FIRE_START);
      dist = (1 - (1 - t) * (1 - t)) * 7.0; // fast burst out (ease-out)
    } else if (vh < SLOW_END) {
      const t = (vh - OUT_END) / (SLOW_END - OUT_END);
      dist = 7.0 + t * 2.0; // slow-mo creep, lingering ~8 units out
    } else if (vh < GONE) {
      const t = (vh - SLOW_END) / (GONE - SLOW_END);
      dist = 9.0 + t * t * FAR; // accelerate off
    } else {
      visible = false;
    }

    mesh.visible = visible;
    if (!visible) return;
    // Bullet path ignores the bob (stays level) — remove the bob from origin.
    mesh.position.copy(_pos);
    mesh.position.y -= bob;
    mesh.position.addScaledVector(_dir, START_OFFSET + dist);
    _spin.setFromAxisAngle(_zAxis, spinState.current.angle);
    mesh.quaternion.copy(_quat).multiply(_spin);
  });

  return (
    <>
      <mesh ref={ref} visible={false}>
        <boxGeometry args={[0.46, 0.46, 1.7]} />
        <meshStandardMaterial
          color="#274a78"
          emissive="#5b8fd6"
          emissiveIntensity={1.1}
          roughness={0.45}
          metalness={0}
        />
      </mesh>
      <mesh ref={flashRef} visible={false}>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshBasicMaterial
          color="#cdfaff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -120]} receiveShadow>
      <planeGeometry args={[800, 800]} />
      <meshStandardMaterial color="#cfcabf" roughness={1} metalness={0} />
    </mesh>
  );
}

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
