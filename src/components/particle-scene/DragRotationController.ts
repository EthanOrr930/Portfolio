const DRAG_SPEED = 0.005;

/**
 * Applies mouse-drag rotation directly to the model rather than orbiting the camera.
 * Left-click drag rotates around X and Y axes.
 */
export class DragRotationController {
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private onRotate: (rotation: [number, number, number]) => void,
    private getRotation: () => [number, number, number],
  ) {}

  bind(element: HTMLElement): () => void {
    const onPointerDown = (e: PointerEvent) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      const [rx, ry, rz] = this.getRotation();
      this.onRotate([rx + dy * DRAG_SPEED, ry + dx * DRAG_SPEED, rz]);
    };

    const onPointerUp = () => {
      this.dragging = false;
    };

    element.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }
}
