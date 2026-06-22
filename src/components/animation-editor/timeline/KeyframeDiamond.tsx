"use client";

import { useCallback, useRef, useState } from "react";
import { vhToPx } from "./useTimelineDrag";
import { ContextMenu } from "./ContextMenu";

interface KeyframeDiamondProps {
  id: string;
  vh: number;
  selected: boolean;
  shiftSelected?: boolean;
  color?: string;
  onClick: (id: string, shiftKey: boolean) => void;
  onDrag: (id: string, newVh: number) => void;
  onDelete: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function KeyframeDiamond({
  id,
  vh,
  selected,
  shiftSelected = false,
  color = "#a1a1aa",
  onClick,
  onDrag,
  onDelete,
  containerRef,
}: KeyframeDiamondProps) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startVh = useRef(0);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      dragging.current = true;
      startX.current = e.clientX;
      startVh.current = vh;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [vh],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startX.current;
      const dvh = dx / 100;
      const newVh = Math.max(0, startVh.current + dvh);
      onDrag(id, Math.round(newVh * 10) / 10);
    },
    [id, onDrag],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const wasDrag = Math.abs(e.clientX - startX.current) > 3;
      dragging.current = false;
      if (!wasDrag) {
        onClick(id, e.shiftKey);
      }
    },
    [id, onClick],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenu({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  return (
    <>
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10 group"
        style={{ left: vhToPx(vh) }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
      >
        {shiftSelected && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rotate-45 rounded-sm border-2 border-dashed border-blue-400 pointer-events-none" />
        )}
        <div
          className={`w-3 h-3 rotate-45 border-2 transition-colors ${
            selected
              ? "border-zinc-900 shadow-sm"
              : shiftSelected
                ? "border-blue-500 bg-blue-100"
                : "border-zinc-300 bg-white group-hover:border-zinc-400"
          }`}
          style={
            selected
              ? { borderColor: color, backgroundColor: color }
              : undefined
          }
        />
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            {
              label: "Delete keyframe",
              danger: true,
              onClick: () => onDelete(id),
            },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
