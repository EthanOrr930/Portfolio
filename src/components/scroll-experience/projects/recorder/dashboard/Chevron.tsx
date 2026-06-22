// Inline chevron (avoids a lucide-react dependency for two glyphs).

export function Chevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 150ms ease" }}
    >
      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
