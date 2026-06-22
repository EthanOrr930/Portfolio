"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { StreetCity } from "./projects/city/StreetCity";
import { ProjectTwoCopy } from "./projects/city/ProjectTwoCopy";
import { fireRecorderIntro, fireRecorderReset } from "./projects/recorder/recorderSignal";
import { createBoltGlowTexture } from "./projects/city/glowTexture";
import { useSingleBodyJelly } from "./projects/city/useSingleBodyJelly";
import { VoxelModel } from "@/components/voxel/VoxelModel";

// ── Look ────────────────────────────────────────────────────────────
const SKY = "#f4efe7";
const FOG_NEAR = 17;
const FOG_FAR = 203;
// Intro reveal: fog starts pulled in tight so the whole scene is buried in
// cream, then recedes to (FOG_NEAR, FOG_FAR) as the city unfolds.
const FOG_INTRO_NEAR = 0;
const FOG_INTRO_FAR = 14;
// Fog recede clock (seconds since the intro fired). easeOut so it clears
// immediately (no ease-in lag); the buildings rise locked to its inner edge.
const FOG_DURATION_SEC = 1.5;

// ── Camera: near-locked establishing shot ───────────────────────────
// Start sits essentially at the final framing — only ~2 units higher/further
// out with a hair more downward tilt — so the camera barely drifts into place
// while the *scene* (buildings bouncing up, bolt firing) does the motion.
const CAM_START_POS = new THREE.Vector3(-22.9, 58, 23.5);
const CAM_START_ROT = new THREE.Euler(-0.41, -0.28, -0.1);
const CAM_END_POS = new THREE.Vector3(-22.91, 56.44, 22.32);
const CAM_END_ROT = new THREE.Euler(-0.39, -0.28, -0.1);

// Intro is TIME-BASED — it plays automatically when you scroll into the section
// (smoother + more motion-designed than scrubbing it by scroll).
// Unmount the city Canvas this far past startVh — after the dissolve into the
// recorder, so the third WebGL context is freed (not left rendering, covered).
const ACTIVE_SPAN = 4.5;
const INTRO_DUR = 1.4; // fly-in + building reveal (seconds) — snappy
const CAM_FRAC = 0.8; // camera locks at this fraction — in place BEFORE buildings settle
const FADE_FRAC = 0.25; // section fades fully in this early → clear view almost immediately

// ── Models ──────────────────────────────────────────────────────────
const MODEL_SCALE = 0.2;
const CHAR_POS: [number, number, number] = [-22.76, 41.02, -10.88];
const CHAR_ROT: [number, number, number] = [-3.14, 1.22, -3.14];
const GUN_POS: [number, number, number] = [-18.99, 44.03, -10.36];
const GUN_ROT: [number, number, number] = [-2.74, 0.88, 2.56];

// ── Projectile: TIME-BASED fire-out right after the intro (decelerates as part
//    of the motion-designed sequence), hovers, then SCROLL carries it off. ──
const BOLT_FIRE_DUR = 0.9; // time-based fire-out duration (seconds)
const HOLD_DIST = 9; // units — decelerates to here, then hovers for scroll
const CONTINUE_SPEED = 30; // units per vh of scroll past the hover
const BOLT_FAR = 70; // off-screen distance → bolt gone
const TEXT_GONE_DIST = 48; // bolt distance at which the copy slides back out
const FLASH_DUR = 0.18; // muzzle flash duration (seconds)
const SPIN_PER_VH = 2.5;
const IDLE_SPIN = 0.7;
const START_OFFSET = 0.85;
const BOB_AMP = 0.25;
const BOB_SPEED = 0.8;

interface CitySectionProps {
  scrollVhRef: React.RefObject<number>;
  /** Global scroll vh where the city begins flying in. */
  startVh: number;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Plain ease-in-out (quad): smooth accel/decel, no overshoot — the camera
// just descends and settles.
const easeInOut = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

// Strong decel — the bolt bursts out then slows toward the hover point.
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/**
 * Full-screen Project-2 cinematic: the ruined city + posed character/gun +
 * scroll-fired bolt. Fades up from the panel cream and flies the camera into
 * the locked angle as you scroll past the Hydro Cube. Mounted only when near
 * its window to keep the third WebGL context idle otherwise.
 */
export function CitySection({ scrollVhRef, startVh }: CitySectionProps) {
  const [active, setActive] = useState(false);
  const fadeRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null); // opacity driven in CityContents (pvh-based)

  useEffect(() => {
    // Mount/unmount the Canvas near the section; the section fade itself is
    // time-based (driven from the intro timeline in CityContents).
    const onScroll = () => {
      const vh = scrollVhRef.current ?? 0;
      const near = vh > startVh - 2.5 && vh < startVh + ACTIVE_SPAN;
      setActive((prev) => (prev === near ? prev : near));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollVhRef, startVh]);

  return (
    <>
      <div
        ref={fadeRef}
        className="fixed inset-0 z-20"
        style={{ background: SKY, opacity: 0, pointerEvents: "none" }}
      >
        {active && (
          <Canvas
            camera={{ position: CAM_START_POS.toArray(), fov: 40, far: 6000 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
            style={{ background: "transparent" }}
          >
            {/* Opaque sky so the EffectComposer composites correctly; the
                parent div's opacity still handles the fade-in. */}
            <color attach="background" args={[SKY]} />
            {/* Start tight so the scene is fully fogged on frame 0 (buildings
                hidden); CityContents recedes it open each frame. */}
            <fog attach="fog" args={[SKY, FOG_INTRO_NEAR, FOG_INTRO_FAR]} />
            <hemisphereLight args={["#f3eee4", "#6f6c66", 1.1]} />
            <directionalLight position={[-60, 90, 50]} intensity={1.6} color="#fff6e8" />
            <directionalLight position={[60, 50, -30]} intensity={0.4} color="#cfd6e0" />
            <CityContents scrollVhRef={scrollVhRef} startVh={startVh} copyRef={copyRef} fadeRef={fadeRef} />
            <EffectComposer multisampling={4}>
              {/* High threshold so only the laser bolt + muzzle flash bloom,
                  not the bright cream sky. */}
              <Bloom
                mipmapBlur
                intensity={1.1}
                luminanceThreshold={0.92}
                luminanceSmoothing={0.18}
              />
              <Vignette offset={0.5} darkness={0.26} blendFunction={BlendFunction.NORMAL} />
            </EffectComposer>
          </Canvas>
        )}
      </div>
      <ProjectTwoCopy copyRef={copyRef} />
    </>
  );
}

const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _spin = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _qa = new THREE.Quaternion().setFromEuler(CAM_START_ROT);
const _qb = new THREE.Quaternion().setFromEuler(CAM_END_ROT);

interface IntroState {
  started: boolean;
  startClock: number;
  t: number;
  done: boolean;
  doneVh: number;
}

/** Advance the time-based intro: triggers on scroll-in past startVh, plays over
 *  INTRO_DUR seconds, resets if you scroll back above the section. */
function updateIntro(it: IntroState, vh: number, now: number, startVh: number): void {
  if (vh < startVh - 0.2) {
    it.started = false;
    it.done = false;
    it.t = 0;
    return;
  }
  if (!it.started) {
    if (vh < startVh) return; // lead-in band — not triggered yet
    it.started = true;
    it.startClock = now;
    it.done = false;
  }
  if (!it.done) {
    it.t = clamp01((now - it.startClock) / INTRO_DUR);
    if (it.t >= 1) {
      it.done = true;
      it.doneVh = vh;
    }
  }
}

interface CityContentsProps extends CitySectionProps {
  copyRef: React.RefObject<HTMLDivElement | null>;
  fadeRef: React.RefObject<HTMLDivElement | null>;
}

function CityContents({ scrollVhRef, startVh, copyRef, fadeRef }: CityContentsProps) {
  const { camera, scene } = useThree();
  const [gun, setGun] = useState<THREE.Object3D | null>(null);
  const muzzleRef = useRef<THREE.Object3D>(null);
  const boltRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const spin = useRef({ angle: 0, vel: 0, lastVh: 0 });
  const boltJelly = useSingleBodyJelly();
  const intro = useRef<IntroState>({ started: false, startClock: 0, t: 0, done: false, doneVh: 0 });
  const boltState = useRef<{ phase: "idle" | "firing" | "hold"; fireClock: number; holdVh: number }>({
    phase: "idle",
    fireClock: 0,
    holdVh: 0,
  });
  const textShown = useRef(false);
  const recorderFiredRef = useRef(false); // copy gone → recorder armed (dissolve out)
  const cityOpacity = useRef(0); // smoothed fade so the dissolve-out eases
  const glowTex = useMemo(() => createBoltGlowTexture(), []);

  useFrame((state, dt) => {
    const vh = scrollVhRef.current ?? 0;
    const now = state.clock.elapsedTime;
    const it = intro.current;
    updateIntro(it, vh, now, startVh);

    // ── Camera fly-in (own ease, locks early at CAM_FRAC) ──
    const e = easeInOut(it.started ? clamp01(it.t / CAM_FRAC) : 0);
    camera.position.lerpVectors(CAM_START_POS, CAM_END_POS, e);
    camera.quaternion.slerpQuaternions(_qa, _qb, e);

    // ── Fog recede + building reveal share ONE eased clock ──
    // easeOut → the fog zooms out immediately (no ease-in lag); the buildings'
    // reveal is locked to the same value so each rises as the fog's inner edge
    // sweeps past it (front-to-back), rather than popping up ahead of the fog.
    const fogProgress = it.started ? clamp01((now - it.startClock) / FOG_DURATION_SEC) : 0;
    const fe = easeOutCubic(fogProgress);
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = FOG_INTRO_NEAR + (FOG_NEAR - FOG_INTRO_NEAR) * fe;
      fog.far = FOG_INTRO_FAR + (FOG_FAR - FOG_INTRO_FAR) * fe;
    }
    if (fadeRef.current) {
      const introFade = it.started ? clamp01(it.t / FADE_FRAC) : 0;
      // Once the copy exits and the recorder takes over, dissolve the city out.
      const target = recorderFiredRef.current ? 0 : introFade;
      cityOpacity.current += (target - cityOpacity.current) * Math.min(1, dt * 5);
      fadeRef.current.style.opacity = String(cityOpacity.current);
    }

    const bolt = boltRef.current;
    const flash = flashRef.current;
    const muzzle = muzzleRef.current;
    if (!gun || !muzzle) return;

    // ── Breathing gun bob (time-based, ¼ unit), refresh world matrix ──
    const bob = Math.sin(now * BOB_SPEED) * BOB_AMP;
    gun.position.y = GUN_POS[1] + bob;
    gun.updateMatrixWorld(true);
    muzzle.getWorldPosition(_pos);
    gun.getWorldQuaternion(_quat);
    _dir.set(0, 0, 1).applyQuaternion(_quat).normalize();

    // ── Spin: scroll-velocity driven, time-based idle carry-over ──
    const dts = Math.max(dt, 1e-4);
    const scrollVel = (vh - spin.current.lastVh) / dts;
    spin.current.lastVh = vh;
    const target = Math.abs(scrollVel) > 0.03 ? scrollVel * SPIN_PER_VH : IDLE_SPIN;
    spin.current.vel += (target - spin.current.vel) * Math.min(1, dt * 3);
    spin.current.angle += spin.current.vel * dt;

    // ── Bolt: time-based fire-out after the intro, decelerating to a hover,
    //    then scroll carries it the rest of the way off-screen ──
    const b = boltState.current;
    if (!it.done) b.phase = "idle";
    else if (b.phase === "idle") {
      b.phase = "firing";
      b.fireClock = now;
    }

    let dist = 0;
    let boltVisible = false;
    let textRevealed = false;
    if (b.phase === "firing") {
      const ft = clamp01((now - b.fireClock) / BOLT_FIRE_DUR);
      dist = easeOutCubic(ft) * HOLD_DIST; // bursts out, decelerating to the hover
      boltVisible = true;
      textRevealed = true;
      if (ft >= 1) {
        b.phase = "hold";
        b.holdVh = vh;
      }
    } else if (b.phase === "hold") {
      // Scroll DOWN carries it off-screen; scroll UP retracts it all the way
      // back into the gun (clamp at 0) so the city returns to its loaded frame.
      dist = Math.max(0, HOLD_DIST + (vh - b.holdVh) * CONTINUE_SPEED);
      boltVisible = dist > 0.15 && dist < BOLT_FAR; // hidden once back in the muzzle
      textRevealed = dist < TEXT_GONE_DIST;
    }

    // Muzzle flash — time-based, at the moment of firing.
    if (flash) {
      const ft = now - b.fireClock;
      const on = b.phase === "firing" && ft < FLASH_DUR;
      flash.visible = on;
      if (on) {
        const k = 1 - ft / FLASH_DUR;
        flash.position.copy(_pos).addScaledVector(_dir, 0.3);
        flash.scale.setScalar(0.35 + k * 1.3);
        (flash.material as THREE.MeshBasicMaterial).opacity = k * 0.95;
      }
    }

    // Copy slides in/out (motion-designed, via data-shown) — no fade. The same
    // flip drives the city→recorder handoff: copy gone → fire the spin-in; copy
    // back (scroll-up reverses the bolt) → reset the recorder so it replays.
    if (textShown.current !== textRevealed) {
      textShown.current = textRevealed;
      copyRef.current
        ?.querySelectorAll<HTMLElement>(".project-copy-enter")
        .forEach((el) => (el.dataset.shown = textRevealed ? "true" : "false"));
      if (textRevealed) {
        recorderFiredRef.current = false;
        fireRecorderReset();
      } else {
        recorderFiredRef.current = true;
        fireRecorderIntro();
      }
    }

    const glow = glowRef.current;
    if (bolt) bolt.visible = boltVisible;
    if (glow) glow.visible = boltVisible;
    if (bolt && boltVisible) {
      bolt.position.copy(_pos);
      bolt.position.y -= bob; // bullet path stays level
      bolt.position.addScaledVector(_dir, START_OFFSET + dist);
      bolt.position.add(boltJelly.apply(bolt.position, state.camera, dt));
      _spin.setFromAxisAngle(_zAxis, spin.current.angle);
      bolt.quaternion.copy(_quat).multiply(_spin);
      if (glow) {
        glow.position.copy(bolt.position);
        glow.scale.setScalar(3.4);
      }
    }
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -120]} receiveShadow>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial color="#cfcabf" roughness={1} metalness={0} />
      </mesh>
      <StreetCity />
      <VoxelModel
        url="/models/voxel-character.json"
        scale={MODEL_SCALE}
        position={CHAR_POS}
        rotation={CHAR_ROT}
      />
      <VoxelModel
        ref={setGun}
        url="/models/voxel-gun.json"
        scale={MODEL_SCALE}
        position={GUN_POS}
        rotation={GUN_ROT}
        muzzleAnchorRef={muzzleRef}
        interactive
        desaturate={0.35}
      />
      <mesh ref={boltRef} visible={false}>
        <boxGeometry args={[0.46, 0.46, 1.7]} />
        <meshStandardMaterial
          color="#274a78"
          emissive="#5b8fd6"
          emissiveIntensity={3.0}
          roughness={0.45}
          metalness={0}
        />
      </mesh>
      <sprite ref={glowRef} visible={false}>
        <spriteMaterial
          map={glowTex}
          color="#8fc0ff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
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
