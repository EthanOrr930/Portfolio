import { cascadeOriginToDir } from "./cascadeOrigin";
import { applyEasing } from "./easing";
import type { CascadeState } from "./types";

interface CascadeAxis {
  dirX: number;
  dirY: number;
  dirZ: number;
  mode: number;
  windowSize: number;
  maxStart: number;
  progress: number;
}

interface MainState extends CascadeAxis {
  easing: number;
}

interface FallState extends CascadeAxis {
  active: boolean;
  distance: number;
}

const DEFAULT_WINDOW_FLOOR = 0.6;

function normalizeDirection(dx: number, dy: number, dz: number) {
  const len = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / len, y: dy / len, z: dz / len };
}

function windowFromSpread(spread: number): number {
  return Math.max(1 - spread, DEFAULT_WINDOW_FLOOR);
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Resolves a particle's cascade-interpolated rest ("home") position in
 * mesh-local space. Mirrors the cascade vertex shader exactly so that
 * CPU-side gelatinous physics track the visible on-screen position.
 *
 * Usage per frame:
 *   resolver.bind(...);          // once, when buffers change
 *   resolver.prepare(cs);
 *   resolver.prepareFall(...);
 *   for each i: if hasParticle(i) { resolver.baseFor(i); ... }
 */
export class CascadeBaseResolver {
  x = 0;
  y = 0;
  z = 0;

  private posA!: Float32Array;
  private posB!: Float32Array;
  private scaleA!: Float32Array;
  private randoms!: Float32Array;

  private readonly main: MainState = {
    dirX: 0, dirY: -1, dirZ: 0, mode: 0,
    windowSize: 1, maxStart: 0, progress: 0, easing: 0,
  };
  private readonly fall: FallState = {
    active: false, dirX: 0, dirY: 1, dirZ: 0, mode: 0,
    windowSize: DEFAULT_WINDOW_FLOOR, maxStart: 0, progress: 0, distance: 2.8,
  };

  bind(
    posA: Float32Array,
    posB: Float32Array,
    scaleA: Float32Array,
    randoms: Float32Array,
  ): void {
    this.posA = posA;
    this.posB = posB;
    this.scaleA = scaleA;
    this.randoms = randoms;
  }

  prepare(cs: CascadeState): void {
    const raw = cascadeOriginToDir(cs.cascadeOrigin);
    const dir = normalizeDirection(raw[0], raw[1], raw[2]);
    const m = this.main;
    m.dirX = dir.x; m.dirY = dir.y; m.dirZ = dir.z;
    m.mode = raw[3];
    m.windowSize = windowFromSpread(cs.cascadeSpread);
    m.maxStart = 1 - m.windowSize;
    m.progress = cs.transitionProgress;
    m.easing = cs.positionEasing;
  }

  prepareFall(
    fallProgress: number,
    fallCascadeOrigin: string,
    cascadeSpread: number,
    fallDistance: number,
  ): void {
    const raw = cascadeOriginToDir(fallCascadeOrigin);
    const dir = normalizeDirection(raw[0], raw[1], raw[2]);
    const f = this.fall;
    f.active = fallProgress > 0;
    f.dirX = dir.x; f.dirY = dir.y; f.dirZ = dir.z;
    f.mode = raw[3];
    f.windowSize = windowFromSpread(cascadeSpread);
    f.maxStart = 1 - f.windowSize;
    f.progress = fallProgress;
    f.distance = fallDistance;
  }

  hasParticle(index: number): boolean {
    return this.scaleA[index] >= 0;
  }

  baseFor(index: number): void {
    this.resolveMainPosition(index);
    if (!this.fall.active) return;
    const fallT = this.computeFallT(index);
    if (fallT <= 0) return;
    this.applyFallImpulse(index, fallT);
  }

  private projectCoord(
    index: number,
    mode: number,
    dx: number,
    dy: number,
    dz: number,
  ): number {
    if (mode === 2) return this.randoms[index * 4];
    const src = mode === 1 ? this.posB : this.posA;
    const i3 = index * 3;
    const proj = src[i3] * dx + src[i3 + 1] * dy + src[i3 + 2] * dz;
    return clamp01(proj * 0.5 + 0.5);
  }

  private resolveMainPosition(index: number): void {
    const m = this.main;
    const coord = this.projectCoord(index, m.mode, m.dirX, m.dirY, m.dirZ);
    const rawP = (m.progress - coord * m.maxStart) / m.windowSize;
    const p = applyEasing(clamp01(rawP), m.easing);
    const inv = 1 - p;
    const i3 = index * 3;
    this.x = this.posA[i3]     * inv + this.posB[i3]     * p;
    this.y = this.posA[i3 + 1] * inv + this.posB[i3 + 1] * p;
    this.z = this.posA[i3 + 2] * inv + this.posB[i3 + 2] * p;
  }

  private computeFallT(index: number): number {
    const f = this.fall;
    const coord = this.projectCoord(index, f.mode, f.dirX, f.dirY, f.dirZ);
    const rawT = (f.progress - coord * f.maxStart) / f.windowSize;
    return clamp01(rawT);
  }

  private applyFallImpulse(index: number, fallT: number): void {
    const nd = this.computeImpulseDirection(index);
    const springT = fallT * 3.5;
    const springEnv = 1 - Math.exp(-1.8 * springT) * Math.cos(4.5 * springT);
    const gravity = fallT * fallT * 1.8;
    const d = this.fall.distance;

    this.x += nd.x * springEnv * d * 0.15;
    this.y += nd.y * springEnv * d * 0.1 - gravity * d;
    this.z += nd.z * springEnv * d * 0.15;
  }

  private computeImpulseDirection(index: number) {
    const i4 = index * 4;
    const rx = this.randoms[i4]     * 2 - 1;
    const rz = this.randoms[i4 + 2] * 2 - 1;
    const rw = this.randoms[i4 + 3];
    const sdLen = Math.hypot(rx, rz) || 1;
    const sMag = 0.5 + rw * 0.5;
    const ix = (rx / sdLen) * sMag;
    const iy = 0.35;
    const iz = (rz / sdLen) * sMag;
    return normalizeDirection(ix, iy, iz);
  }
}
