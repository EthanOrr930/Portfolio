"use client";

import { useMemo } from "react";
import type { TextElement } from "@/lib/pages/types";

interface KeyframeTextBlockProps {
  elements: TextElement[];
  /** 0 = fully hidden (below), 1 = fully visible, 2 = fully hidden (above) */
  visibility: number;
}

function getTransform(visibility: number, animation?: string): string {
  if (visibility <= 0) {
    // Entering from below
    switch (animation) {
      case "slide-left":
        return "translateX(-40px)";
      case "slide-right":
        return "translateX(40px)";
      case "fade":
        return "translateY(0)";
      default: // slide-up
        return "translateY(30px)";
    }
  }
  if (visibility >= 2) {
    // Exiting above
    switch (animation) {
      case "slide-left":
        return "translateX(40px)";
      case "slide-right":
        return "translateX(-40px)";
      case "fade":
        return "translateY(0)";
      default:
        return "translateY(-30px)";
    }
  }
  return "translateY(0)";
}

function getOpacity(visibility: number): number {
  if (visibility <= 0 || visibility >= 2) return 0;
  // Fade in during 0..1 and fade out during 1..2
  if (visibility <= 1) return visibility;
  return 2 - visibility;
}

export function KeyframeTextBlock({ elements, visibility }: KeyframeTextBlockProps) {
  const containerOpacity = useMemo(() => getOpacity(visibility), [visibility]);

  if (containerOpacity < 0.01) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity: containerOpacity,
        transition: "opacity 0.1s ease-out",
      }}
    >
      {elements.map((el) => {
        const transform = getTransform(visibility, el.enterAnimation);
        const delay = el.enterDelay ?? 0;

        return (
          <div
            key={el.id}
            className="absolute pointer-events-none"
            style={{
              left: `${el.position.x}%`,
              top: `${el.position.y}%`,
              transform: `translate(-50%, -50%) ${transform}`,
              transition: `transform 0.4s ease-out ${delay}s, opacity 0.4s ease-out ${delay}s`,
              fontFamily: el.style.fontFamily,
              fontSize: `${el.style.fontSize}px`,
              fontWeight: el.style.fontWeight,
              color: el.style.color,
              opacity: el.style.opacity,
              textAlign: el.style.textAlign,
              letterSpacing: el.style.letterSpacing
                ? `${el.style.letterSpacing}em`
                : undefined,
              lineHeight: el.style.lineHeight ?? undefined,
              maxWidth: el.style.maxWidth ? `${el.style.maxWidth}px` : undefined,
              whiteSpace: el.style.maxWidth ? "normal" : "nowrap",
            }}
          >
            {el.text}
          </div>
        );
      })}
    </div>
  );
}
