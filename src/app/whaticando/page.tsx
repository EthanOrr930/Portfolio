"use client";

// TEMP dev harness (owner: ethan, 2026-06) — the neumorphic "what I can do"
// skills-by-project finale, full cream viewport, so the soft UI renders for real.
import { SkillsSection } from "@/components/scroll-experience/skills/SkillsSection";

export default function WhatICanDoPage() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <SkillsSection />
    </div>
  );
}
