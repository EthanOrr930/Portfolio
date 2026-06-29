"use client";

import { motion } from "motion/react";
import { SkillTile } from "./SkillTile";
import type { SkillProject } from "./skillsData";

// Keyed on the project: switching tabs remounts the grid, so the new project's
// tiles stagger in. No AnimatePresence/exit-gating — the content always reflects
// the active project immediately (robust even if rAF is throttled), the stagger
// is pure polish on top.
const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.03 } },
};

export function SkillTileGrid({ project }: { project: SkillProject }) {
  return (
    <motion.div
      key={project.id}
      variants={grid}
      initial="hidden"
      animate="show"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 18,
      }}
    >
      {project.skills.map((s) => (
        <SkillTile key={s.label} label={s.label} Icon={s.Icon} accent={project.accent} />
      ))}
    </motion.div>
  );
}
