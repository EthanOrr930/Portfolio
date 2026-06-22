import type { CascadeAttributes } from "./CascadeMeshBuilder";
import type { CascadeState, DecodedKeyframe } from "./types";

/**
 * Copies the A / B keyframe data into the instanced mesh attributes whenever
 * the (A, B) pair changes. Cheap to call every frame — it skips the copy
 * when the pair key hasn't moved.
 */
export class KeyframeBufferWriter {
  private lastPairKey = "";

  constructor(private readonly count: number) {}

  writeIfChanged(cs: CascadeState, attrs: CascadeAttributes): void {
    const key = this.pairKey(cs);
    if (key === this.lastPairKey) return;
    this.lastPairKey = key;
    this.writeSide(cs.keyframeA, attrs.posA, attrs.scaleA);
    this.writeSide(cs.keyframeB, attrs.posB, attrs.scaleB);
    attrs.posA.needsUpdate = true;
    attrs.posB.needsUpdate = true;
    attrs.scaleA.needsUpdate = true;
    attrs.scaleB.needsUpdate = true;
  }

  reset(): void {
    this.lastPairKey = "";
  }

  private pairKey(cs: CascadeState): string {
    return (
      `${cs.keyframeA.count}-${cs.keyframeB.count}` +
      `-${cs.keyframeA.positions[0]}-${cs.keyframeB.positions[0]}`
    );
  }

  private writeSide(
    source: DecodedKeyframe,
    posAttr: { array: ArrayLike<number> },
    scaleAttr: { array: ArrayLike<number> },
  ): void {
    const positions = posAttr.array as Float32Array;
    const scales = scaleAttr.array as Float32Array;
    const stride = this.strideFor(source);
    for (let i = 0; i < this.count; i++) {
      if (i >= source.count) {
        scales[i] = -1;
        continue;
      }
      this.copyParticle(source, positions, scales, i, stride);
    }
  }

  private copyParticle(
    source: DecodedKeyframe,
    positions: Float32Array,
    scales: Float32Array,
    index: number,
    stride: number,
  ): void {
    const srcIndex = Math.min(Math.floor(index * stride), source.count - 1);
    positions[index * 3]     = source.positions[srcIndex * 3];
    positions[index * 3 + 1] = source.positions[srcIndex * 3 + 1];
    positions[index * 3 + 2] = source.positions[srcIndex * 3 + 2];
    scales[index] = source.scales[srcIndex];
  }

  private strideFor(source: DecodedKeyframe): number {
    return source.count > this.count ? source.count / this.count : 1;
  }
}
