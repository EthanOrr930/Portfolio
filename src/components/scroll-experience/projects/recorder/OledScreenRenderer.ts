import * as THREE from "three";
import {
  drawOledContent,
  OLED_W,
  OLED_H,
  CONTENT_H,
  type OledFrameInput,
} from "./oledDraw";

/**
 * Owns the OLED's offscreen canvas + CanvasTexture and repaints it each frame
 * from the recorder state. One concern: pixels. The texture is meant to drive
 * an emissive screen material so Bloom makes the lit pixels glow.
 */
export class OledScreenRenderer {
  readonly texture: THREE.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    const canvas = document.createElement("canvas");
    canvas.width = OLED_W;
    canvas.height = OLED_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("OLED 2D context unavailable");
    this.ctx = ctx;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    this.texture = tex;
  }

  render(input: OledFrameInput): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#05080c";
    ctx.fillRect(0, 0, OLED_W, OLED_H);
    if (input.powered) {
      ctx.save();
      ctx.translate(0, (OLED_H - CONTENT_H) / 2); // letterbox the 2:1 content
      drawOledContent(ctx, input);
      ctx.restore();
    }
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
