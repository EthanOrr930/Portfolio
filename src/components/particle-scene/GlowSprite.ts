import * as THREE from "three";

const SPRITE_SIZE = 32;

/** Creates a reusable radial gradient texture for glowing particles. */
export function createGlowSprite(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;

  const ctx = canvas.getContext("2d")!;
  const center = SPRITE_SIZE / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);

  gradient.addColorStop(0, "rgba(100,90,80,1)");
  gradient.addColorStop(0.5, "rgba(100,90,80,0.9)");
  gradient.addColorStop(0.75, "rgba(100,90,80,0.3)");
  gradient.addColorStop(1, "rgba(100,90,80,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

  return new THREE.CanvasTexture(canvas);
}
