import * as THREE from "three";

// Uniform (linear) playback through the full frame sequence — every fold step
// gets equal time, the way AT's AnimationMixer scrubs the clip. Slow, so each reads.
const FOLD_DURATION = 6.0; // seconds

/**
 * Plays the baked fold: interpolates the geometry through Active Theory's fold
 * keyframes (flat → dart) by one eased progress on Send. Stateful → a class.
 */
export class PaperFoldController {
  private clock = 0;
  private folding = false;
  private settled = false;

  constructor(
    private readonly geometry: THREE.BufferGeometry,
    private readonly frames: Float32Array[],
  ) {}

  get done(): boolean {
    return this.folding;
  }

  get isAnimating(): boolean {
    return this.folding && !this.settled;
  }

  /** Fully folded and the fold has finished playing. */
  get isSettled(): boolean {
    return this.settled;
  }

  /** Start the single timed fold (the one fold path). */
  foldAll(): void {
    this.folding = true;
    this.clock = 0;
    this.settled = false;
  }

  reset(): void {
    this.folding = false;
    this.clock = 0;
    this.settled = false;
    this.writeProgress(0);
  }

  /** Advance the timed fold; interpolate keyframes into the geometry. */
  update(delta: number): void {
    if (!this.folding || this.settled) return;
    this.clock += delta;
    const p = Math.min(1, this.clock / FOLD_DURATION);
    this.writeProgress(p); // linear → uniform per-keyframe timing
    if (p >= 1) this.settled = true;
  }

  /** progress 0→1 walks the whole keyframe chain (flat → dart). */
  private writeProgress(progress: number): void {
    const segments = this.frames.length - 1;
    const t = progress * segments;
    const i = Math.min(segments - 1, Math.floor(t));
    const f = t - i;
    const a = this.frames[i];
    const b = this.frames[i + 1];
    const attr = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let k = 0; k < arr.length; k++) {
      arr[k] = a[k] + (b[k] - a[k]) * f;
    }
    attr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
