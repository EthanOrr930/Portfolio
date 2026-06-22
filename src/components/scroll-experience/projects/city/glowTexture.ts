import * as THREE from "three";

/**
 * Soft radial glow sprite texture for the projectile — bright blue core
 * fading to transparent, drawn once on a canvas. Additive-blended in the
 * scene so it reads as a halo of light around the bolt.
 */
export function createBoltGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, "rgba(200, 228, 255, 0.95)");
  grad.addColorStop(0.25, "rgba(120, 170, 245, 0.55)");
  grad.addColorStop(0.6, "rgba(70, 120, 220, 0.18)");
  grad.addColorStop(1, "rgba(60, 110, 210, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
