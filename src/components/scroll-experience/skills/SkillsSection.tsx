"use client";

import { useState } from "react";
import { motion, MotionConfig } from "motion/react";
import { NEUMORPHIC } from "../projects/city/neumorphic";
import { Eyebrow, Headline, Body } from "../projects/ProjectTypography";
import { SKILL_PROJECTS } from "./skillsData";
import { ProjectThumbTabs } from "./ProjectThumbTabs";
import { SkillTileGrid } from "./SkillTileGrid";

/**
 * "What I can do" — a full-bleed neumorphic finale. Project thumbnails are tabs;
 * each reveals the skills applied on that project as extruded tiles that stagger
 * in. Same cream as the surface everywhere, so everything reads molded, not
 * floating. Typography flows through the shared Eyebrow/Headline/Body primitives.
 */
export function SkillsSection() {
  const [activeId, setActiveId] = useState(SKILL_PROJECTS[0].id);
  const project = SKILL_PROJECTS.find((p) => p.id === activeId) ?? SKILL_PROJECTS[0];

  return (
    <MotionConfig reducedMotion="user">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: NEUMORPHIC.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "7vh 7vw",
        }}
      >
        <div style={{ width: "100%", maxWidth: 860 }}>
          <Eyebrow style={{ marginBottom: 14 }}>What I can do</Eyebrow>
          {/* Engraved (debossed) headline against the cream — the carved counter
              to the raised tiles. */}
          <Headline size="section" style={{ margin: "0 0 30px", textShadow: "0 1px 1px rgba(255,253,247,0.55)" }}>
            Skills, applied — by project
          </Headline>

          <ProjectThumbTabs activeId={activeId} onSelect={setActiveId} />

          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{ margin: "28px 0 24px" }}
          >
            <Body style={{ fontSize: 14.5, lineHeight: 1.6, color: NEUMORPHIC.inkSoft, maxWidth: "62ch" }}>
              <span style={{ color: NEUMORPHIC.ink, fontWeight: 500 }}>{project.name}</span> — {project.tagline}
            </Body>
          </motion.div>

          <SkillTileGrid project={project} />
        </div>
      </div>
    </MotionConfig>
  );
}
