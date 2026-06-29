import * as THREE from "three";
import type {
  GelatinousField,
  MouseVelocityTracker,
} from "../gelatinousPhysics";
import type { CascadeBaseResolver } from "./CascadeBaseResolver";
import type { CascadeBundle } from "./CascadeMeshBuilder";
import type { CascadeState } from "./types";

const MAX_STEP_SECONDS = 0.033;
const IDLE_ANGULAR_EPSILON = 1e-4;

export interface PhysicsDependencies {
  bundle: CascadeBundle;
  resolver: CascadeBaseResolver;
  field: GelatinousField;
  tracker: MouseVelocityTracker;
  camera: THREE.Camera;
}

/**
 * Drives the per-frame gelatinous-push + angular torque integration for the
 * cascade particles. Holds no state of its own — all state lives on the
 * GelatinousField / CascadeBaseResolver / bundle. Skips the whole loop when
 * reduced-motion is active.
 */
export class CascadePhysicsDriver {
  constructor(
    private readonly count: number,
    private readonly reducedMotion: boolean,
  ) {}

  step(
    cs: CascadeState,
    deps: PhysicsDependencies,
    rawDelta: number,
    falloffDistance: number,
  ): void {
    const dt = Math.min(rawDelta, MAX_STEP_SECONDS);
    const { tracker, field, camera, bundle, resolver } = deps;

    tracker.update(dt);
    field.prepare(camera, bundle.mesh, tracker);
    this.prepareResolver(cs, bundle, resolver, falloffDistance);

    // Both buffers are only mutated by integrateAllParticles, so when motion
    // is disabled they never change — skip the GPU re-upload entirely.
    if (this.reducedMotion) return;

    this.integrateAllParticles(deps, dt);
    bundle.attrs.offset.needsUpdate = true;
    bundle.attrs.spinBoost.needsUpdate = true;
  }

  private prepareResolver(
    cs: CascadeState,
    bundle: CascadeBundle,
    resolver: CascadeBaseResolver,
    falloffDistance: number,
  ): void {
    const attrs = bundle.attrs;
    resolver.bind(
      attrs.posA.array as Float32Array,
      attrs.posB.array as Float32Array,
      attrs.scaleA.array as Float32Array,
      bundle.cpu.instanceRandoms,
    );
    resolver.prepare(cs);
    resolver.prepareFall(
      cs.falloffProgress ?? 0,
      cs.fallCascadeOrigin ?? cs.cascadeOrigin,
      cs.cascadeSpread,
      falloffDistance,
    );
  }

  private integrateAllParticles(deps: PhysicsDependencies, dt: number): void {
    const { bundle, resolver, field, tracker } = deps;
    const offsets = bundle.attrs.offset.array as Float32Array;
    const spinBoosts = bundle.attrs.spinBoost.array as Float32Array;
    const { velocities, angularVelocities } = bundle.cpu;

    for (let i = 0; i < this.count; i++) {
      if (!resolver.hasParticle(i)) continue;
      resolver.baseFor(i);
      const impulse = field.integrate(
        i,
        resolver.x, resolver.y, resolver.z,
        offsets,
        velocities,
        tracker,
        dt,
      );
      if (this.isIdle(impulse, angularVelocities[i])) continue;
      this.integrateAngularStep(i, impulse, bundle, spinBoosts, field, dt);
    }
  }

  private integrateAngularStep(
    index: number,
    impulse: number,
    bundle: CascadeBundle,
    spinBoosts: Float32Array,
    field: GelatinousField,
    dt: number,
  ): void {
    const axes = bundle.cpu.randomAxes;
    const angularVelocities = bundle.cpu.angularVelocities;
    const a3 = index * 3;
    field.integrateAngular(
      index,
      impulse,
      axes[a3], axes[a3 + 1], axes[a3 + 2],
      spinBoosts,
      angularVelocities,
      dt,
    );
  }

  private isIdle(impulse: number, angularVelocity: number): boolean {
    return impulse <= 0 && Math.abs(angularVelocity) < IDLE_ANGULAR_EPSILON;
  }
}
