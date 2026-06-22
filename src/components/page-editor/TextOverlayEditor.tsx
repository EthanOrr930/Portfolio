"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { TextElementHandle } from "./TextElementHandle";
import type { TextElement } from "@/lib/pages/types";

const GRID_SIZES = [
  { label: "Off", value: 0 },
  { label: "2%", value: 2 },
  { label: "5%", value: 5 },
  { label: "10%", value: 10 },
];

interface TextOverlayEditorProps {
  elements: TextElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<TextElement>) => void;
  onDeleteElement: (id: string) => void;
}

export function TextOverlayEditor({
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
}: TextOverlayEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [dragging, setDragging] = useState(false);
  const [gridSize, setGridSize] = useState(2);
  const [snapLines, setSnapLines] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setContainerRect(el.getBoundingClientRect());
    });
    observer.observe(el);
    setContainerRect(el.getBoundingClientRect());
    return () => observer.disconnect();
  }, []);

  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target === containerRef.current) {
        onSelectElement(null);
      }
    },
    [onSelectElement],
  );

  const snapTargets = useMemo(() => {
    const xTargets: number[] = [50];
    const yTargets: number[] = [50];

    for (const el of elements) {
      if (el.id === selectedElementId) continue;
      xTargets.push(el.position.x);
      yTargets.push(el.position.y);
    }

    return { x: xTargets, y: yTargets };
  }, [elements, selectedElementId]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onPointerDown={handleBackgroundPointerDown}
    >
      {/* Grid overlay */}
      {gridSize > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ opacity: 0.06 }}>
          <defs>
            <pattern
              id="grid"
              width={`${gridSize}%`}
              height={`${gridSize}%`}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${0} 0 L 0 0 0 ${0}`}
                fill="none"
                stroke="white"
                strokeWidth="0.5"
              />
              <line x1="0" y1="0" x2="100%" y2="0" stroke="white" strokeWidth="0.5" />
              <line x1="0" y1="0" x2="0" y2="100%" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}

      {/* Grid toggle */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded px-2 py-1">
        <span className="text-[9px] font-mono text-zinc-500 mr-1">Grid</span>
        {GRID_SIZES.map((g) => (
          <button
            key={g.value}
            onClick={() => setGridSize(g.value)}
            className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
              gridSize === g.value
                ? "bg-zinc-200 text-zinc-700"
                : "text-zinc-500 hover:text-zinc-600"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Snap guide lines */}
      {dragging && snapLines.x !== null && (
        <div
          className="absolute top-0 bottom-0 w-px bg-blue-400/40 pointer-events-none z-20"
          style={{ left: `${snapLines.x}%` }}
        />
      )}
      {dragging && snapLines.y !== null && (
        <div
          className="absolute left-0 right-0 h-px bg-blue-400/40 pointer-events-none z-20"
          style={{ top: `${snapLines.y}%` }}
        />
      )}

      {elements.map((el) => (
        <TextElementHandle
          key={el.id}
          element={el}
          selected={el.id === selectedElementId}
          onSelect={() => onSelectElement(el.id)}
          onChange={(updates) => onUpdateElement(el.id, updates)}
          onDelete={() => onDeleteElement(el.id)}
          containerRect={containerRect}
          snapTargets={snapTargets}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          onSnapLines={setSnapLines}
          gridSize={gridSize}
        />
      ))}
    </div>
  );
}
