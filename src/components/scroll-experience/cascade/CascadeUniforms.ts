import * as THREE from "three";
import { cascadeOriginToDir } from "./cascadeOrigin";
import type { CascadeState } from "./types";

export interface CascadeUniformMap extends Record<string, THREE.IUniform> {
  u_time: THREE.IUniform<number>;
  u_transitionProgress: THREE.IUniform<number>;
  u_cascadeSpread: THREE.IUniform<number>;
  u_cascadeDir: THREE.IUniform<THREE.Vector3>;
  u_cascadeMode: THREE.IUniform<number>;
  u_particleScale: THREE.IUniform<number>;
  u_debugNoDepthScale: THREE.IUniform<boolean>;
  u_positionEasing: THREE.IUniform<number>;
  u_depthFarA: THREE.IUniform<number>;
  u_depthNearA: THREE.IUniform<number>;
  u_depthFarB: THREE.IUniform<number>;
  u_depthNearB: THREE.IUniform<number>;
  u_falloffProgress: THREE.IUniform<number>;
  u_falloffDistance: THREE.IUniform<number>;
  u_fallCascadeDir: THREE.IUniform<THREE.Vector3>;
  u_fallCascadeMode: THREE.IUniform<number>;
  u_introProgress: THREE.IUniform<number>;
}

export function createCascadeUniforms(): CascadeUniformMap {
  return {
    u_time:               { value: 0 },
    u_transitionProgress: { value: 0 },
    u_cascadeSpread:      { value: 0.5 },
    u_cascadeDir:         { value: new THREE.Vector3(0, -1, 0) },
    u_cascadeMode:        { value: 0 },
    u_particleScale:      { value: 0.035 },
    u_debugNoDepthScale:  { value: false },
    u_positionEasing:     { value: 0 },
    u_depthFarA:          { value: 3.5 },
    u_depthNearA:         { value: 1.8 },
    u_depthFarB:          { value: 3.5 },
    u_depthNearB:         { value: 1.8 },
    u_falloffProgress:    { value: 0 },
    u_falloffDistance:    { value: 2.8 },
    u_fallCascadeDir:     { value: new THREE.Vector3(0, 1, 0) },
    u_fallCascadeMode:    { value: 0 },
    // 1 = figure fully assembled (no intro displacement). The IntroController
    // drives this down toward 0 on first load, then back to 1 as it settles.
    u_introProgress:      { value: 1 },
  };
}

/**
 * Pushes cascade state + elapsed time into the shader uniform bundle.
 * One concern — no mesh logic, no physics, no keyframe buffer work.
 */
export class CascadeUniformsSync {
  constructor(private readonly uniforms: CascadeUniformMap) {}

  sync(cs: CascadeState, delta: number, debugNoDepthScale: boolean): void {
    this.advanceTime(delta);
    this.writeCascade(cs);
    this.writeDepth(cs);
    this.writeFall(cs);
    this.uniforms.u_debugNoDepthScale.value = debugNoDepthScale;
  }

  get falloffDistance(): number {
    return this.uniforms.u_falloffDistance.value;
  }

  /** Load-intro assemble amount: 0 = scattered/spun, 1 = settled figure. */
  setIntroProgress(value: number): void {
    this.uniforms.u_introProgress.value = value;
  }

  private advanceTime(delta: number): void {
    this.uniforms.u_time.value += delta;
  }

  private writeCascade(cs: CascadeState): void {
    const dir = cascadeOriginToDir(cs.cascadeOrigin);
    this.uniforms.u_transitionProgress.value = cs.transitionProgress;
    this.uniforms.u_cascadeSpread.value = cs.cascadeSpread;
    this.uniforms.u_cascadeDir.value.set(dir[0], dir[1], dir[2]);
    this.uniforms.u_cascadeMode.value = dir[3];
    this.uniforms.u_positionEasing.value = cs.positionEasing;
  }

  private writeDepth(cs: CascadeState): void {
    this.uniforms.u_depthFarA.value = cs.depthFarA;
    this.uniforms.u_depthNearA.value = cs.depthNearA;
    this.uniforms.u_depthFarB.value = cs.depthFarB;
    this.uniforms.u_depthNearB.value = cs.depthNearB;
  }

  private writeFall(cs: CascadeState): void {
    const fallDir = cascadeOriginToDir(cs.fallCascadeOrigin ?? cs.cascadeOrigin);
    this.uniforms.u_falloffProgress.value = cs.falloffProgress ?? 0;
    this.uniforms.u_fallCascadeDir.value.set(fallDir[0], fallDir[1], fallDir[2]);
    this.uniforms.u_fallCascadeMode.value = fallDir[3];
  }
}
