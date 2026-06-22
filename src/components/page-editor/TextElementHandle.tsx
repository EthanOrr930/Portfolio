"use client";

import { useRef, useCallback, useState } from "react";
import type { TextElement } from "@/lib/pages/types";

const SNAP_THRESHOLD = 1.0; // percentage units

interface TextElementHandleProps {
  element: TextElement;
  selected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<TextElement>) => void;
  onDelete: () => void;
  containerRect: DOMRect | null;
  snapTargets: { x: number[]; y: number[] };
  onDragStart: () => void;
  onDragEnd: () => void;
  onSnapLines: (lines: { x: number | null; y: number | null }) => void;
  gridSize: number; // 0 = no grid snap
}

function snapTo(value: number, targets: number[], threshold: number): { value: number; snapped: number | null } {
  for (const t of targets) {
    if (Math.abs(value - t) < threshold) {
      return { value: t, snapped: t };
    }
  }
  return { value, snapped: null };
}

export function TextElementHandle({
  element,
  selected,
  onSelect,
  onChange,
  onDelete,
  containerRect,
  snapTargets,
  onDragStart,
  onDragEnd,
  onSnapLines,
  gridSize,
}: TextElementHandleProps) {
  const [editing, setEditing] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();

      if (!containerRect) return;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startX: element.position.x,
        startY: element.position.y,
      };
      onDragStart();

      const handleMove = (ev: PointerEvent) => {
        if (!dragStartRef.current || !containerRect) return;
        const dx = ((ev.clientX - dragStartRef.current.x) / containerRect.width) * 100;
        const dy = ((ev.clientY - dragStartRef.current.y) / containerRect.height) * 100;

        let newX = Math.max(0, Math.min(100, dragStartRef.current.startX + dx));
        let newY = Math.max(0, Math.min(100, dragStartRef.current.startY + dy));

        // Grid snap
        if (gridSize > 0) {
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }

        // Element snap (overrides grid if close to a target)
        const sx = snapTo(newX, snapTargets.x, SNAP_THRESHOLD);
        const sy = snapTo(newY, snapTargets.y, SNAP_THRESHOLD);
        newX = sx.value;
        newY = sy.value;
        onSnapLines({ x: sx.snapped, y: sy.snapped });

        onChange({ position: { x: newX, y: newY } });
      };

      const handleUp = () => {
        dragStartRef.current = null;
        onSnapLines({ x: null, y: null });
        onDragEnd();
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [element.position, onChange, onSelect, containerRect, snapTargets, onDragStart, onDragEnd, onSnapLines],
  );

  return (
    <div
      className={`absolute cursor-move select-none ${
        selected ? "ring-1 ring-blue-400/60 ring-offset-1 ring-offset-transparent" : ""
      }`}
      style={{
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        transform: "translate(-50%, -50%)",
        fontFamily: element.style.fontFamily,
        fontSize: `${element.style.fontSize}px`,
        fontWeight: element.style.fontWeight,
        color: element.style.color,
        opacity: element.style.opacity,
        textAlign: element.style.textAlign,
        letterSpacing: element.style.letterSpacing
          ? `${element.style.letterSpacing}em`
          : undefined,
        lineHeight: element.style.lineHeight ?? undefined,
        maxWidth: element.style.maxWidth ? `${element.style.maxWidth}px` : undefined,
        whiteSpace: element.style.maxWidth ? "normal" : "nowrap",
        zIndex: selected ? 10 : 1,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={element.text}
          onChange={(e) => onChange({ text: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setEditing(false);
          }}
          className="bg-transparent border-b border-zinc-300 outline-none text-inherit font-inherit"
          style={{ fontSize: "inherit", fontWeight: "inherit", fontFamily: "inherit" }}
        />
      ) : (
        element.text
      )}

      {selected && (
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-500/80 text-zinc-900 text-[10px] flex items-center justify-center hover:bg-red-500"
        >
          x
        </button>
      )}
    </div>
  );
}
