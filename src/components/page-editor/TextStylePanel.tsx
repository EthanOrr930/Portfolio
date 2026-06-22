"use client";

import type { TextElement, TextStyle, EnterAnimation } from "@/lib/pages/types";

interface TextStylePanelProps {
  element: TextElement;
  onChange: (updates: Partial<TextElement>) => void;
}

const FONT_OPTIONS = [
  "Geist",
  "Geist Mono",
  "Inter",
  "Roboto",
  "Space Grotesk",
  "JetBrains Mono",
  "Playfair Display",
  "Libre Baskerville",
];

export function TextStylePanel({ element, onChange }: TextStylePanelProps) {
  const { style } = element;

  const updateStyle = (updates: Partial<TextStyle>) => {
    onChange({ style: { ...style, ...updates } });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
        Text Style
      </h3>

      {/* Font Family */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">Font</span>
        <select
          value={style.fontFamily}
          onChange={(e) => updateStyle({ fontFamily: e.target.value })}
          className="w-full mt-1 bg-zinc-100 border border-zinc-200 rounded px-2 py-1 text-xs font-mono text-zinc-700"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>

      {/* Font Size */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Size ({style.fontSize}px)
        </span>
        <input
          type="range"
          min={8}
          max={120}
          step={1}
          value={style.fontSize}
          onChange={(e) => updateStyle({ fontSize: +e.target.value })}
          className="w-full accent-white/50"
        />
      </label>

      {/* Font Weight */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Weight ({style.fontWeight})
        </span>
        <input
          type="range"
          min={100}
          max={900}
          step={100}
          value={style.fontWeight}
          onChange={(e) => updateStyle({ fontWeight: +e.target.value })}
          className="w-full accent-white/50"
        />
      </label>

      {/* Color */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">Color</span>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="color"
            value={style.color}
            onChange={(e) => updateStyle({ color: e.target.value })}
            className="w-6 h-6 rounded border border-zinc-200 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={style.color}
            onChange={(e) => updateStyle({ color: e.target.value })}
            className="flex-1 bg-zinc-100 border border-zinc-200 rounded px-2 py-1 text-xs font-mono text-zinc-700"
          />
        </div>
      </label>

      {/* Opacity */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Opacity ({style.opacity.toFixed(2)})
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={style.opacity}
          onChange={(e) => updateStyle({ opacity: +e.target.value })}
          className="w-full accent-white/50"
        />
      </label>

      {/* Text Align */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">Align</span>
        <div className="flex gap-1 mt-1">
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              onClick={() => updateStyle({ textAlign: align })}
              className={`flex-1 px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                style.textAlign === align
                  ? "bg-zinc-200 text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </label>

      {/* Letter Spacing */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Letter Spacing ({(style.letterSpacing ?? 0).toFixed(2)}em)
        </span>
        <input
          type="range"
          min={-0.1}
          max={1}
          step={0.01}
          value={style.letterSpacing ?? 0}
          onChange={(e) => updateStyle({ letterSpacing: +e.target.value })}
          className="w-full accent-white/50"
        />
      </label>

      {/* Max Width */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Max Width ({style.maxWidth ?? "none"})
        </span>
        <input
          type="range"
          min={0}
          max={800}
          step={10}
          value={style.maxWidth ?? 0}
          onChange={(e) => {
            const v = +e.target.value;
            updateStyle({ maxWidth: v > 0 ? v : undefined });
          }}
          className="w-full accent-white/50"
        />
      </label>

      {/* Enter Animation */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">Enter Animation</span>
        <select
          value={element.enterAnimation ?? "slide-up"}
          onChange={(e) => onChange({ enterAnimation: e.target.value as EnterAnimation })}
          className="w-full mt-1 bg-zinc-100 border border-zinc-200 rounded px-2 py-1 text-xs font-mono text-zinc-700"
        >
          <option value="slide-up">Slide Up</option>
          <option value="fade">Fade</option>
          <option value="slide-left">Slide Left</option>
          <option value="slide-right">Slide Right</option>
        </select>
      </label>

      {/* Enter Delay */}
      <label className="block">
        <span className="text-[10px] font-mono text-zinc-500">
          Enter Delay ({(element.enterDelay ?? 0).toFixed(1)}s)
        </span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={element.enterDelay ?? 0}
          onChange={(e) => onChange({ enterDelay: +e.target.value })}
          className="w-full accent-white/50"
        />
      </label>
    </div>
  );
}
