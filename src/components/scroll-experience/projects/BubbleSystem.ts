import * as THREE from "three";
import { createBubbleInstancedMesh, randInRange } from "./bubbleHelpers";
import {
  DEFAULT_BUBBLE_CONFIG,
  type BubbleSpawnProvider,
  type BubbleSystemConfig,
} from "./bubbleTypes";

export type { BubbleSpawnProvider, BubbleSystemConfig };
export { DEFAULT_BUBBLE_CONFIG };

interface BubbleSlot {
  active: boolean;
  age: number;
  lifetime: number;
  baseScale: number;
  phase: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

interface EmissionState {
  active: boolean;
  remaining: number;
  rate: number;
  accumulator: number;
  provider: BubbleSpawnProvider | null;
}

const ZERO_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);
const IDENTITY_QUAT = new THREE.Quaternion();

/**
 * Pool of small translucent spheres that act as bubbles escaping the cube
 * as it enters water. Continuous emission window opened by startEmission;
 * per-bubble lifecycle ticked by step().
 *
 * Stateful → class. One concern: bubble lifecycle + GPU buffer writes.
 */
export class BubbleSystem {
  readonly mesh: THREE.InstancedMesh;
  private readonly config: BubbleSystemConfig;
  private readonly slots: BubbleSlot[];
  private readonly scratch = new THREE.Matrix4();
  private readonly scratchPos = new THREE.Vector3();
  private readonly scratchVel = new THREE.Vector3();
  private readonly scratchScale = new THREE.Vector3();
  private readonly emission: EmissionState;

  constructor(config: BubbleSystemConfig = DEFAULT_BUBBLE_CONFIG) {
    this.config = config;
    this.mesh = createBubbleInstancedMesh(config.poolSize);
    this.slots = createSlots(config.poolSize);
    this.emission = {
      active: false,
      remaining: 0,
      rate: 0,
      accumulator: 0,
      provider: null,
    };
    this.zeroAll();
  }

  get activeCount(): number {
    return this.activeSlotCount;
  }

  /** True when no bubbles are live and emission isn't running — lets
   *  step() short-circuit the 192-slot loop in the common idle case. */
  private get isIdle(): boolean {
    return !this.emission.active && this.activeSlotCount === 0;
  }

  private activeSlotCount = 0;

  /** Open a finite emission window. The provider is called per new bubble
   *  for spawn point + source velocity — so emission follows the cube
   *  regardless of its current rotation or position. */
  startEmission(
    durationSec: number,
    rate: number,
    provider: BubbleSpawnProvider,
  ): void {
    this.emission.active = true;
    this.emission.remaining = durationSec;
    this.emission.rate = rate;
    this.emission.accumulator = 0;
    this.emission.provider = provider;
  }

  stopEmission(): void {
    this.emission.active = false;
    this.emission.remaining = 0;
  }

  /** Clear every bubble + stop emission. */
  reset(): void {
    this.stopEmission();
    for (let i = 0; i < this.slots.length; i++) {
      this.deactivate(i, this.slots[i]);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  step(delta: number): void {
    this.advanceShaderTime(delta);
    if (this.isIdle) return;
    if (this.emission.active) this.tickEmission(delta);
    this.integrateAll(delta);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Keep the bubble shader's shimmer animating even while idle (cheap). */
  private advanceShaderTime(delta: number): void {
    const material = this.mesh.material as THREE.ShaderMaterial;
    const uTime = material.uniforms?.uTime;
    if (uTime) uTime.value += delta;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    const material = this.mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material.dispose();
    this.mesh.dispose();
  }

  // ── Emission tick ─────────────────────────────────────────────────

  private tickEmission(delta: number): void {
    this.emission.remaining -= delta;
    if (this.emission.remaining <= 0) {
      this.emission.active = false;
      this.emission.remaining = 0;
      return;
    }
    this.emission.accumulator += this.emission.rate * delta;
    while (this.emission.accumulator >= 1) {
      this.emission.accumulator -= 1;
      this.emitOne();
    }
  }

  private emitOne(): void {
    const slot = this.findInactiveSlot();
    if (!slot || !this.emission.provider) return;
    this.primeSlot(slot, this.emission.provider);
  }

  private findInactiveSlot(): BubbleSlot | null {
    for (const s of this.slots) if (!s.active) return s;
    return null;
  }

  // ── Spawn + integration ──────────────────────────────────────────

  private primeSlot(slot: BubbleSlot, provider: BubbleSpawnProvider): void {
    const c = this.config;
    provider.samplePosition(slot.pos);
    provider.sampleSourceVelocity(this.scratchVel);
    const rise = randInRange(c.initialRiseSpeedMin, c.initialRiseSpeedMax);
    const jit = c.lateralJitter;
    slot.vel.set(
      randInRange(-jit, jit) + this.scratchVel.x * c.cubeVelocityInheritance,
      rise + this.scratchVel.y * c.cubeVelocityInheritance,
      randInRange(-jit, jit) + this.scratchVel.z * c.cubeVelocityInheritance,
    );
    // Weight the distribution toward small: cubing the uniform sample skews
    // most bubbles to the low end, with only a few reaching full size.
    const sizeT = Math.pow(Math.random(), 3);
    slot.baseScale = c.baseScaleMin + (c.baseScaleMax - c.baseScaleMin) * sizeT;
    slot.lifetime = randInRange(c.lifetimeMin, c.lifetimeMax);
    slot.phase = Math.random() * Math.PI * 2;
    slot.age = 0;
    slot.active = true;
    this.activeSlotCount++;
  }

  private integrateAll(delta: number): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.active) {
        this.mesh.setMatrixAt(i, ZERO_MATRIX);
        continue;
      }
      slot.age += delta;
      if (slot.age >= slot.lifetime) {
        this.deactivate(i, slot);
        continue;
      }
      this.advanceSlot(slot, delta);
      this.writeSlotMatrix(i, slot);
    }
  }

  private advanceSlot(slot: BubbleSlot, delta: number): void {
    const c = this.config;
    const dragFactor = Math.exp(-c.riseDrag * delta);
    slot.vel.y = (slot.vel.y + c.buoyancy * delta) * dragFactor;
    slot.vel.x *= dragFactor;
    slot.vel.z *= dragFactor;
    // Lateral wobble on both axes (phase-offset so it traces a slow oval)
    // plus a lower-frequency ambient meander — gives each bubble an
    // independent floaty drift instead of a single-axis shimmy.
    const wobbleX = Math.sin(slot.age * c.wobbleFreq + slot.phase) * c.wobbleAmp;
    const wobbleZ =
      Math.cos(slot.age * c.wobbleFreq * 0.85 + slot.phase) * c.wobbleAmp;
    const driftX =
      Math.sin(slot.age * c.wobbleFreq * 0.33 + slot.phase * 1.7) *
      c.wobbleAmp * 0.6;
    const driftZ =
      Math.cos(slot.age * c.wobbleFreq * 0.29 + slot.phase * 1.3) *
      c.wobbleAmp * 0.6;
    slot.pos.x += (slot.vel.x + wobbleX + driftX) * delta;
    slot.pos.y += slot.vel.y * delta;
    slot.pos.z += (slot.vel.z + wobbleZ + driftZ) * delta;
  }

  private writeSlotMatrix(index: number, slot: BubbleSlot): void {
    const liveScale = slot.baseScale * this.scaleEnvelope(slot);
    this.scratchScale.set(liveScale, liveScale, liveScale);
    this.scratchPos.copy(slot.pos);
    this.scratch.compose(this.scratchPos, IDENTITY_QUAT, this.scratchScale);
    this.mesh.setMatrixAt(index, this.scratch);
  }

  private scaleEnvelope(slot: BubbleSlot): number {
    const ageFrac = slot.age / slot.lifetime;
    if (ageFrac < this.config.fadeScaleStart) return 1;
    const fadeFrac =
      (ageFrac - this.config.fadeScaleStart) /
      (1 - this.config.fadeScaleStart);
    return Math.max(0, 1 - fadeFrac);
  }

  private deactivate(index: number, slot: BubbleSlot): void {
    if (slot.active) this.activeSlotCount--;
    slot.active = false;
    slot.age = 0;
    this.mesh.setMatrixAt(index, ZERO_MATRIX);
  }

  private zeroAll(): void {
    for (let i = 0; i < this.slots.length; i++) {
      this.mesh.setMatrixAt(i, ZERO_MATRIX);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

function createSlots(poolSize: number): BubbleSlot[] {
  const slots: BubbleSlot[] = new Array(poolSize);
  for (let i = 0; i < poolSize; i++) {
    slots[i] = {
      active: false,
      age: 0,
      lifetime: 0,
      baseScale: 0,
      phase: 0,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
    };
  }
  return slots;
}
