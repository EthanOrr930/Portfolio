import type { RecorderState } from "./RecorderStateMachine";

// The firmware OLED UI is 128×64 (2:1). We draw it into a 512×256 region, but
// the physical window is taller (~1.68:1), so the canvas is 512×304 and the
// content is letterboxed (black bars top/bottom blend with the OLED black).
// White-on-black so only lit pixels survive the Bloom threshold and glow.
export const OLED_W = 512;
export const OLED_H = 304;
export const CONTENT_H = 256;
const INK = "#eaf6ff";
const FONT = (px: number) => `${px}px "Geist Mono", ui-monospace, monospace`;

export interface OledFrameInput {
  state: RecorderState;
  holdProgress: number;
  elapsedSec: number;
  timeLeftSec: number;
  vu: Float32Array; // 8 bars, 0..1
  title: string;
  deviceName: string;
  sessionLabel: string; // "< 1/3 >"
  blinkOn: boolean;
  scrollPx: number;
  powered: boolean;
  clock: number; // seconds, for the boot spinner
}

type Ctx = CanvasRenderingContext2D;
type Align = "left" | "center" | "right";

function text(ctx: Ctx, s: string, x: number, y: number, px: number, align: Align = "left") {
  ctx.fillStyle = INK;
  ctx.font = FONT(px);
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(s, x, y);
}

function mmss(totalSec: number): string {
  const sign = totalSec < 0 ? "+" : "";
  const s = Math.abs(Math.floor(totalSec));
  return `${sign}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function progressBar(ctx: Ctx, frac: number) {
  const x = 48;
  const y = 120;
  const w = OLED_W - 96;
  const h = 40;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 6, y + 6, (w - 12) * Math.max(0, Math.min(1, frac)), h - 12);
}

function vuMeter(ctx: Ctx, vu: Float32Array) {
  const bars = vu.length;
  const bw = 18;
  const gap = 10;
  const total = bars * bw + (bars - 1) * gap;
  const x0 = (OLED_W - total) / 2;
  const baseY = 150;
  const maxH = 70;
  ctx.fillStyle = INK;
  for (let i = 0; i < bars; i++) {
    const h = Math.max(3, vu[i] * maxH);
    ctx.fillRect(x0 + i * (bw + gap), baseY - h, bw, h);
  }
}

function scrollingTitle(ctx: Ctx, s: string, y: number, scrollPx: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(24, y - 24, OLED_W - 48, 48);
  ctx.clip();
  text(ctx, s, OLED_W / 2 - scrollPx, y, 30, "center");
  ctx.restore();
}

/** Draws the UI into the 512×CONTENT_H region (caller fills bg + letterboxes). */
export function drawOledContent(ctx: Ctx, input: OledFrameInput): void {
  switch (input.state) {
    case "BOOT":
      return drawBoot(ctx, input);
    case "CONFIRM_START":
      return drawConfirm(ctx, input, "HOLD TO START");
    case "CONFIRM_STOP":
      return drawConfirm(ctx, input, "HOLD TO STOP");
    case "RECORDING":
      return drawRecording(ctx, input);
    case "FINALIZING":
    case "DONE":
      return drawFinalizing(ctx, input);
    default:
      return drawStandby(ctx, input);
  }
}

function drawStandby(ctx: Ctx, input: OledFrameInput) {
  text(ctx, input.deviceName, OLED_W / 2, 34, 28, "center");
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 70);
  ctx.lineTo(OLED_W - 24, 70);
  ctx.stroke();
  scrollingTitle(ctx, input.title, 128, input.scrollPx);
  text(ctx, input.sessionLabel, 28, 220, 24, "left");
  text(ctx, "HOLD TO START", OLED_W - 28, 220, 24, "right");
}

function drawConfirm(ctx: Ctx, input: OledFrameInput, label: string) {
  text(ctx, input.deviceName, OLED_W / 2, 40, 28, "center");
  text(ctx, input.holdProgress >= 1 ? "RELEASE" : label, OLED_W / 2, 88, 30, "center");
  progressBar(ctx, input.holdProgress);
  text(ctx, "release to cancel", OLED_W / 2, 192, 22, "center");
}

function drawRecording(ctx: Ctx, input: OledFrameInput) {
  const dot = input.blinkOn ? "● " : "  ";
  text(ctx, `${dot}REC`, 28, 32, 28, "left");
  text(ctx, mmss(input.elapsedSec), OLED_W - 28, 32, 28, "right");
  vuMeter(ctx, input.vu);
  scrollingTitle(ctx, input.title, 188, input.scrollPx);
  text(ctx, `TIME LEFT ${mmss(input.timeLeftSec)}`, 28, 224, 22, "left");
  text(ctx, "HOLD TO STOP", OLED_W - 28, 224, 22, "right");
}

function drawFinalizing(ctx: Ctx, input: OledFrameInput) {
  text(ctx, input.deviceName, OLED_W / 2, 60, 26, "center");
  text(ctx, "FINALIZING", OLED_W / 2, 132, 34, "center");
}

// 8 dots in a circle, head rotating clockwise — faithful to the firmware
// boot_spinner (sizes taper 5,4,4,3,3,2,2,1 from the head; ×4 for this canvas).
const SPIN_SIZE = [20, 16, 16, 12, 12, 8, 8, 4];

function drawBoot(ctx: Ctx, input: OledFrameInput) {
  const cx = OLED_W / 2;
  const cy = 100;
  const radius = 46;
  const frame = Math.floor(input.clock / 0.08); // 80ms/frame like the firmware
  ctx.fillStyle = INK;
  for (let i = 0; i < 8; i++) {
    const dist = (((frame - i) % 8) + 8) % 8; // trail distance from the head
    const sz = SPIN_SIZE[dist];
    const theta = -Math.PI / 2 + i * (Math.PI / 4); // head at top on frame 0
    ctx.beginPath();
    ctx.arc(cx + Math.cos(theta) * radius, cy + Math.sin(theta) * radius, sz / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, "STARTING UP", OLED_W / 2, 196, 28, "center");
}
