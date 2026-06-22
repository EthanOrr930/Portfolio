"use client";

import { useCallback, useRef, useState } from "react";
import { vhToPx, PIXELS_PER_VH } from "./useTimelineDrag";
import { ContextMenu } from "./ContextMenu";

interface TransitionBlockProps {
  id: string;
  fromVh: number;
  toVh: number;
  startOffset: number;
  endOffset: number;
  selected: boolean;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
  onStartOffsetChange: (id: string, offset: number) => void;
  onEndOffsetChange: (id: string, offset: number) => void;
}

/**
 * A draggable wall handle inside the transition block.
 * Renders as a thick vertical line with col-resize cursor.
 */
function WallHandle({
  positionPx,
  side,
  onDragStart,
}: {
  positionPx: number;
  side: "left" | "right";
  onDragStart: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="absolute top-0 bottom-0 z-10 cursor-col-resize group/wall"
      style={{
        left: positionPx - 4,
        width: 8,
      }}
      onPointerDown={onDragStart}
    >
      {/* Visible line */}
      <div
        className={`absolute top-0 bottom-0 w-0.5 ${
          side === "left" ? "left-[3.5px]" : "left-[3.5px]"
        } bg-blue-500 group-hover/wall:bg-blue-600 transition-colors`}
      />
      {/* Wider hover target indicator */}
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1.5 h-4 bg-blue-500 rounded-full opacity-0 group-hover/wall:opacity-60 transition-opacity" />
    </div>
  );
}

export function TransitionBlock({
  id,
  fromVh,
  toVh,
  startOffset,
  endOffset,
  selected,
  onClick,
  onDelete,
  onStartOffsetChange,
  onEndOffsetChange,
}: TransitionBlockProps) {
  const draggingWall = useRef<"left" | "right" | null>(null);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const safe = (n: number) => (Number.isFinite(n) ? n : 0);
  const blockLeft = safe(vhToPx(fromVh));
  const blockWidth = safe(vhToPx(toVh - fromVh));
  const span = safe(toVh - fromVh);
  const safeStartOffset = safe(startOffset);
  const safeEndOffset = safe(endOffset);

  if (blockWidth <= 0) return null;

  // Positions within the block (relative to block left)
  const leftWallPx = safe(vhToPx(safeStartOffset));
  const rightWallPx = safe(blockWidth - vhToPx(safeEndOffset));

  const handleWallPointerDown = useCallback(
    (side: "left" | "right", e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      draggingWall.current = side;
      dragStartX.current = e.clientX;
      dragStartOffset.current = side === "left" ? safeStartOffset : safeEndOffset;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [startOffset, endOffset],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingWall.current) return;
      const dx = e.clientX - dragStartX.current;
      const dvh = dx / PIXELS_PER_VH;

      if (draggingWall.current === "left") {
        const newOffset = Math.max(0, dragStartOffset.current + dvh);
        const maxOffset = span - safeEndOffset - 0.1;
        onStartOffsetChange(id, Math.min(newOffset, Math.max(0, maxOffset)));
      } else {
        const newOffset = Math.max(0, dragStartOffset.current - dvh);
        const maxOffset = span - safeStartOffset - 0.1;
        onEndOffsetChange(id, Math.min(newOffset, Math.max(0, maxOffset)));
      }
    },
    [id, span, startOffset, endOffset, onStartOffsetChange, onEndOffsetChange],
  );

  const handlePointerUp = useCallback(() => {
    draggingWall.current = null;
  }, []);

  return (
    <>
    <div
      className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-sm overflow-hidden transition-shadow ${
        selected ? "ring-1 ring-blue-400 shadow-sm" : ""
      }`}
      style={{ left: blockLeft, width: blockWidth }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        e.stopPropagation();
        onClick(id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {/* Hold A region (before left wall) */}
      <div
        className="absolute top-0 bottom-0 left-0 bg-zinc-100 cursor-pointer"
        style={{ width: leftWallPx }}
      >
        {/* Diagonal stripes pattern for hold region */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 3px, #d4d4d8 3px, #d4d4d8 4px)",
          }}
        />
      </div>

      {/* Active transition region (between walls) */}
      <div
        className={`absolute top-0 bottom-0 cursor-pointer ${
          selected ? "bg-blue-200/70" : "bg-blue-100/60 hover:bg-blue-100/80"
        }`}
        style={{ left: leftWallPx, width: safe(rightWallPx - leftWallPx) }}
      >
        {/* Transition icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            className="w-4 h-3 text-blue-400/60"
            viewBox="0 0 16 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 9 L6 3 L10 7 L14 3" />
          </svg>
        </div>
      </div>

      {/* Hold B region (after right wall) */}
      <div
        className="absolute top-0 bottom-0 right-0 bg-zinc-100 cursor-pointer"
        style={{ width: safe(blockWidth - rightWallPx) }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 3px, #d4d4d8 3px, #d4d4d8 4px)",
          }}
        />
      </div>

      {/* Left wall handle */}
      <WallHandle
        positionPx={leftWallPx}
        side="left"
        onDragStart={(e) => handleWallPointerDown("left", e)}
      />

      {/* Right wall handle */}
      <WallHandle
        positionPx={rightWallPx}
        side="right"
        onDragStart={(e) => handleWallPointerDown("right", e)}
      />
    </div>

    {menu && (
      <ContextMenu
        x={menu.x}
        y={menu.y}
        items={[
          {
            label: "Delete transition",
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
