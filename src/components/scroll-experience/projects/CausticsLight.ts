import * as THREE from "three";
import {
  injectCausticsFragment,
  injectCausticsVertex,
} from "@/shaders/causticsShader";

interface CausticsOptions {
  /** Hold time still (reduced-motion) — caustics render but don't animate. */
  freeze: boolean;
}

const CAUSTIC_INTENSITY = 0.55;

/**
 * Projects animated ocean caustics onto a single cube's top faces by
 * patching a standard material with `onBeforeCompile`. Owns the shared time
 * uniform and a per-frame `update` that doubles as a processing gate: when
 * the cube's project is not on screen, time stops advancing and the
 * fragment path early-outs via `uCausticActive`.
 */
export class CausticsLight {
  private readonly uTime = { value: 0 };
  private readonly uTopY = { value: 0 };
  private readonly uIntensity: { value: number };
  private readonly uActive = { value: 0 };
  private readonly freeze: boolean;
  private readonly worldPos = new THREE.Vector3();
  private readonly worldScale = new THREE.Vector3();

  constructor({ freeze }: CausticsOptions) {
    this.freeze = freeze;
    this.uIntensity = { value: CAUSTIC_INTENSITY };
  }

  /** Patch a material so its shader gains the caustic layer. Idempotent per
   *  material — call once after the material mounts. */
  attach(material: THREE.Material): void {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uCausticTime = this.uTime;
      shader.uniforms.uCausticTopY = this.uTopY;
      shader.uniforms.uCausticIntensity = this.uIntensity;
      shader.uniforms.uCausticActive = this.uActive;
      shader.vertexShader = injectCausticsVertex(shader.vertexShader);
      shader.fragmentShader = injectCausticsFragment(shader.fragmentShader);
    };
    material.customProgramCacheKey = () => "caustics";
    material.needsUpdate = true;
  }

  /**
   * Advance one frame. When `active` is false the heavy fragment path is
   * skipped (uniform flag) and time is frozen — no wasted GPU or JS work
   * while the project is off screen.
   */
  update(dt: number, mesh: THREE.Object3D | null, active: boolean): void {
    if (!active) {
      this.uActive.value = 0;
      return;
    }
    this.uActive.value = 1;
    if (!this.freeze) this.uTime.value += dt;
    if (mesh) {
      mesh.getWorldPosition(this.worldPos);
      mesh.getWorldScale(this.worldScale);
      this.uTopY.value = this.worldPos.y + this.worldScale.y * 0.5;
    }
  }
}
