"use client";

import { useEffect, useRef } from "react";

interface ContextMenuItem {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white border border-zinc-200 rounded-md shadow-lg py-1 min-w-[120px]"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
            item.danger
              ? "text-red-600 hover:bg-red-50"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
