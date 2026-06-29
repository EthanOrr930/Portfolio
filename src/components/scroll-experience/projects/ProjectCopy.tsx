"use client";

import type { CSSProperties } from "react";
import { easing, toCssBezier } from "../motionTokens";
import {
  ProjectBulletList,
  ProjectEyebrow,
  ProjectHeadline,
} from "./ProjectTypography";
import { RepoButton } from "./RepoButton";

interface ProjectCopyProps {
  /** Eyebrow label, e.g. "PROJECT 01". Falls back to the project id. */
  eyebrow: string;
  title: string;
  /** Scannable device notes — the shared em-dash bullet list. */
  bullets: string[];
  /** Optional source repo — renders the link button under the bullets. */
  repoUrl?: string;
  /** True once the project's scroll window is active — flips data-shown. */
  revealed: boolean;
}

const ENTER_MS = { eyebrow: 260, headline: 320, body: 280, button: 300 };
const EXIT_MS = { eyebrow: 180, headline: 220, body: 200, button: 200 };
const STAGGER_MS = { eyebrow: 0, headline: 60, body: 120, button: 200 };

/**
 * Per-project copy block — eyebrow + headline + em-dash bullet list, slide-in
 * from left. All typography flows through ProjectTypography so the project
 * section reads as the same hierarchy as the hero/about blocks.
 * The reveal itself lives in globals.css (.project-copy-enter).
 */
export function ProjectCopy({ eyebrow, title, bullets, repoUrl, revealed }: ProjectCopyProps) {
  const shown = revealed ? "true" : "false";
  return (
    <div className="flex flex-col gap-5">
      <ProjectEyebrow
        data-shown={shown}
        className="project-copy-enter"
        style={animationStyle(ENTER_MS.eyebrow, EXIT_MS.eyebrow, STAGGER_MS.eyebrow)}
      >
        {eyebrow}
      </ProjectEyebrow>
      <ProjectHeadline
        data-shown={shown}
        className="project-copy-enter"
        style={animationStyle(ENTER_MS.headline, EXIT_MS.headline, STAGGER_MS.headline)}
      >
        {title}
      </ProjectHeadline>
      <ProjectBulletList
        data-shown={shown}
        className="project-copy-enter"
        style={animationStyle(ENTER_MS.body, EXIT_MS.body, STAGGER_MS.body)}
        items={bullets}
      />
      {repoUrl && (
        // Plain reveal wrapper owns the slide-in; the inner motion link owns
        // hover — separate elements so their transforms never collide.
        <div
          data-shown={shown}
          className="project-copy-enter"
          style={{ ...animationStyle(ENTER_MS.button, EXIT_MS.button, STAGGER_MS.button), marginTop: "0.5rem" }}
        >
          <RepoButton href={repoUrl} />
        </div>
      )}
    </div>
  );
}

function animationStyle(
  enterMs: number,
  exitMs: number,
  delayMs: number,
): CSSProperties {
  return {
    // @ts-expect-error — CSS custom props for the .project-copy-enter block
    "--project-copy-enter-dur": `${enterMs}ms`,
    "--project-copy-exit-dur": `${exitMs}ms`,
    "--project-copy-delay": `${delayMs}ms`,
    "--project-copy-enter-curve": toCssBezier(easing.out),
    "--project-copy-exit-curve": toCssBezier(easing.in),
    "--project-copy-distance": "40px",
  };
}
