"use client";

import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { NEUMORPHIC, raised } from "../projects/city/neumorphic";

// Same cream as the surface, no gradient/border — the molded look is the dual
// box-shadow alone (the neumorphism cardinal rule). Hover deepens the lift.
const variants = {
  hidden: { y: 22, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 360, damping: 24 } },
};

interface SkillTileProps {
  label: string;
  Icon: LucideIcon;
  accent: string;
}

export function SkillTile({ label, Icon, accent }: SkillTileProps) {
  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -3, boxShadow: raised(11, 24), transition: { type: "spring", stiffness: 400, damping: 22 } }}
      style={{
        background: NEUMORPHIC.surface,
        borderRadius: 18,
        padding: "17px 18px 15px",
        boxShadow: raised(7, 16),
      }}
    >
      <Icon size={22} strokeWidth={1.6} color={accent} aria-hidden />
      <div
        style={{
          marginTop: 11,
          fontSize: 13.5,
          fontWeight: 500,
          color: NEUMORPHIC.ink,
          fontFamily: "var(--font-geist-sans), ui-sans-serif, sans-serif",
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}
