import { WASD_SPEED } from "./constants";
import type { TransformState } from "./types";

/**
 * Tracks held keys and applies WASD + Q/E movement to a TransformState.
 * Call `update()` each frame; call `bind()`/unbind via the returned cleanup.
 */
export class KeyboardController {
  private keys = new Set<string>();
  private rafId = 0;
  private lastTime = 0;

  constructor(private onMove: (position: [number, number, number]) => void) {}

  bind(getPosition: () => [number, number, number]): () => void {
    this.lastTime = performance.now();
    const onDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      this.keys.add(e.key.toLowerCase());
    };
    const onUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };

    const tick = () => {
      const now = performance.now();
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      if (this.keys.size > 0) {
        this.applyMovement(getPosition(), dt);
      }
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      cancelAnimationFrame(this.rafId);
    };
  }

  private applyMovement(pos: [number, number, number], dt: number): void {
    const speed = WASD_SPEED * dt;
    let [x, y, z] = pos;

    if (this.keys.has("a")) x += speed;
    if (this.keys.has("d")) x -= speed;
    if (this.keys.has("w")) y -= speed;
    if (this.keys.has("s")) y += speed;
    if (this.keys.has("q")) z += speed;
    if (this.keys.has("e")) z -= speed;

    if (x !== pos[0] || y !== pos[1] || z !== pos[2]) {
      this.onMove([x, y, z]);
    }
  }
}
