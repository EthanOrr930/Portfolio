import { stepSpring, spring as springPresets, prefersReducedMotion } from "./motionTokens";
import type { SpringConfig } from "./motionTokens";

/**
 * RippleText — decorates an existing DOM element with a mouse-driven
 * gelatinous displacement effect that matches the 3D particle physics.
 *
 * How it works:
 *   - An offscreen canvas paints a radial displacement map centred at the
 *     cursor's position relative to the element. The R channel encodes
 *     horizontal push direction (128 = neutral, >128 = push right,
 *     <128 = push left) and G encodes vertical. Pixels near the cursor
 *     get pushed OUTWARD — same radial repulsion as the particle push.
 *   - An SVG `<feImage>` + `<feDisplacementMap>` filter reads the canvas
 *     as the displacement source and applies it to the text.
 *   - The filter's `scale` attribute is spring-driven so the displacement
 *     ramps up on hover and overshoots back to 0 on leave — gelatinous
 *     push/settle feel.
 *
 * The element's existing styles, classes, and transforms are untouched.
 */

let nextId = 0;

export interface RippleTextOptions {
  /** Peak displacement in px. Default 8. */
  peakDisplacement?: number;
  /** Spring config. Default spring.smooth. */
  springConfig?: SpringConfig;
  /** Radius in px from cursor at which effect reaches zero. Default 150. */
  influenceRadius?: number;
}

const MAP_SIZE = 128; // displacement map resolution (cheap to repaint)

export class RippleText {
  private el: HTMLElement;
  private uid: string;
  private reduced: boolean;
  private springCfg: SpringConfig;
  private peakDisplacement: number;
  private influenceRadius: number;

  // DOM
  private filterSvg: SVGSVGElement | null = null;
  private feImage: SVGFEImageElement | null = null;
  private displacement: SVGFEDisplacementMapElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Spring state for the overall scale
  private scaleValue = 0;
  private scaleVelocity = 0;
  private scaleTarget = 0;

  // Cursor position in element-local normalized coords [0,1]
  private cursorNx = 0.5;
  private cursorNy = 0.5;
  private cursorInside = false;

  // Cached layout
  private rect = { x: 0, y: 0, w: 1, h: 1, stamp: 0 };

  constructor(element: HTMLElement, options: RippleTextOptions = {}) {
    this.el = element;
    this.uid = `ripple-fx-${nextId++}`;
    this.reduced = prefersReducedMotion();
    this.springCfg = options.springConfig ?? springPresets.smooth;
    this.peakDisplacement = options.peakDisplacement ?? 8;
    this.influenceRadius = options.influenceRadius ?? 150;

    if (this.reduced) return;
    this.createCanvas();
    this.createFilter();
  }

  destroy(): void {
    this.filterSvg?.remove();
    this.filterSvg = null;
    this.feImage = null;
    this.displacement = null;
    this.canvas = null;
    this.ctx = null;
    this.el.style.filter = "";
  }

  updateMouse(clientX: number, clientY: number): void {
    if (this.reduced) return;

    const now = performance.now();
    if (now - this.rect.stamp > 100) {
      const r = this.el.getBoundingClientRect();
      this.rect.x = r.x;
      this.rect.y = r.y;
      this.rect.w = r.width || 1;
      this.rect.h = r.height || 1;
      this.rect.stamp = now;
    }

    // Cursor position relative to element, normalized to [0,1]
    const nx = (clientX - this.rect.x) / this.rect.w;
    const ny = (clientY - this.rect.y) / this.rect.h;

    // Distance from element center in px
    const cx = this.rect.x + this.rect.w / 2;
    const cy = this.rect.y + this.rect.h / 2;
    const dist = Math.hypot(clientX - cx, clientY - cy);

    this.cursorInside = dist < this.influenceRadius;
    if (this.cursorInside) {
      this.cursorNx = nx;
      this.cursorNy = ny;
      const proximity = 1 - dist / this.influenceRadius;
      this.scaleTarget = this.peakDisplacement * proximity * proximity;
    } else {
      this.scaleTarget = 0;
    }
  }

  tick(delta: number): void {
    if (this.reduced || !this.displacement || !this.ctx || !this.feImage) return;

    // Spring
    const result = stepSpring(
      this.scaleValue,
      this.scaleVelocity,
      this.scaleTarget,
      this.springCfg,
      delta,
    );
    this.scaleValue = result.value;
    this.scaleVelocity = result.velocity;

    // Skip canvas work when displacement is negligible
    if (Math.abs(this.scaleValue) < 0.05 && Math.abs(this.scaleTarget) < 0.05) {
      this.displacement.setAttribute("scale", "0");
      return;
    }

    // Paint the radial displacement map centred at the cursor position.
    // R channel: horizontal push direction (128=neutral, >128=right, <128=left)
    // G channel: vertical push direction (128=neutral, >128=down, <128=up)
    this.paintDisplacementMap();

    // Update the feImage source and displacement scale
    this.feImage.setAttribute("href", this.canvas!.toDataURL("image/png"));
    this.displacement.setAttribute("scale", String(this.scaleValue));
  }

  // ── Private ────────────────────────────────────────────────────

  private createCanvas(): void {
    const c = document.createElement("canvas");
    c.width = MAP_SIZE;
    c.height = MAP_SIZE;
    this.canvas = c;
    this.ctx = c.getContext("2d")!;
  }

  private paintDisplacementMap(): void {
    const ctx = this.ctx!;
    const S = MAP_SIZE;

    // Fill neutral grey (128,128,128) = no displacement
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect(0, 0, S, S);

    // Cursor position on the map
    const cx = this.cursorNx * S;
    const cy = this.cursorNy * S;

    // Paint radial push: each pixel encodes the direction FROM cursor.
    // We use imageData for per-pixel control.
    const imgData = ctx.getImageData(0, 0, S, S);
    const data = imgData.data;

    // Influence radius on the map (proportional to element size)
    const mapRadius = (this.influenceRadius / Math.max(this.rect.w, this.rect.h)) * S;
    const mapRadiusSq = mapRadius * mapRadius;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq > mapRadiusSq || distSq < 0.01) continue;

        const dist = Math.sqrt(distSq);
        // Falloff: quadratic from 1 at cursor to 0 at radius
        const t = 1 - dist / mapRadius;
        const strength = t * t;

        // Normalize direction and encode into 0–255 range
        // (128 = neutral, direction pushes away from cursor)
        const invDist = 1 / dist;
        const ndx = dx * invDist;
        const ndy = dy * invDist;

        const idx = (y * S + x) * 4;
        data[idx] = 128 + Math.round(ndx * strength * 127);     // R = horizontal
        data[idx + 1] = 128 + Math.round(ndy * strength * 127); // G = vertical
        // B,A stay at defaults
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  private createFilter(): void {
    const ns = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(ns, "svg") as SVGSVGElement;
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.style.pointerEvents = "none";

    const defs = document.createElementNS(ns, "defs");
    const filter = document.createElementNS(ns, "filter");
    filter.setAttribute("id", this.uid);
    filter.setAttribute("x", "-10%");
    filter.setAttribute("y", "-10%");
    filter.setAttribute("width", "120%");
    filter.setAttribute("height", "120%");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    // feImage loads the canvas-based displacement map
    const feImg = document.createElementNS(ns, "feImage") as SVGFEImageElement;
    feImg.setAttribute("result", "dispMap");
    feImg.setAttribute("x", "0%");
    feImg.setAttribute("y", "0%");
    feImg.setAttribute("width", "100%");
    feImg.setAttribute("height", "100%");
    feImg.setAttribute("preserveAspectRatio", "none");
    // Initial neutral map
    feImg.setAttribute("href", this.canvas!.toDataURL("image/png"));

    const disp = document.createElementNS(
      ns,
      "feDisplacementMap",
    ) as SVGFEDisplacementMapElement;
    disp.setAttribute("in", "SourceGraphic");
    disp.setAttribute("in2", "dispMap");
    disp.setAttribute("scale", "0");
    disp.setAttribute("xChannelSelector", "R");
    disp.setAttribute("yChannelSelector", "G");

    filter.appendChild(feImg);
    filter.appendChild(disp);
    defs.appendChild(filter);
    svg.appendChild(defs);

    document.body.appendChild(svg);
    this.filterSvg = svg;
    this.feImage = feImg;
    this.displacement = disp;

    this.el.style.filter = `url(#${this.uid})`;
  }
}
