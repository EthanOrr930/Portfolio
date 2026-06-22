"use client";

import { useCallback, useRef } from "react";

export const PIXELS_PER_VH = 100;
export const TIMELINE_PADDING_VH = 5;

/**
 * Converts a pixel offset within the timeline track to a vh value.
 * Accounts for the scroll position of the container.
 */
export function pxToVh(px: number, scrollLeft: number): number {
  return Math.max(0, (px + scrollLeft) / PIXELS_PER_VH);
}

export function vhToPx(vh: number): number {
  return vh * PIXELS_PER_VH;
}

/**
 * Hook for dragging items on the timeline.
 * Returns handlers to attach to a draggable element.
 */
export function useTimelineDrag(
  onDrag: (vh: number) => void,
  onDragEnd?: () => void,
) {
  const dragging = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const getVhFromEvent = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const localX = e.clientX - rect.left;
      return pxToVh(localX, scrollLeft);
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent, container: HTMLElement) => {
      e.stopPropagation();
      e.preventDefault();
      dragging.current = true;
      containerRef.current = container;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const vh = getVhFromEvent(e);
      onDrag(vh);
    },
    [getVhFromEvent, onDrag],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    containerRef.current = null;
    onDragEnd?.();
  }, [onDragEnd]);

  return { onPointerDown, onPointerMove, onPointerUp };
}
