"use client";

import { useEffect, useRef } from "react";
import { curves, toCssBezier, easing, prefersReducedMotion } from "./motionTokens";

/**
 * HeroText — two scroll-driven text blocks overlaid on the particle scene.
 *
 *   Block 1 (Hero): "Ethan Orr" / "engineer, designer, entrepreneur"
 *     - Visible from scroll vh 0, slides OUT upward as scroll crosses
 *       the hero-out window.
 *
 *   Block 2 (About): "about:" / lorem sub
 *     - Slides IN from the left (not a fade) during the scroll segment
 *       between the hero and the next particle keyframe.
 *
 * Scroll-linked transforms are applied directly to the DOM via a single
 * rAF loop reading `scrollVhRef`, never via React state. Reduced-motion
 * swaps the transform-driven reveal for an instant opacity change at the
 * same thresholds.
 */

interface HeroTextProps {
  scrollVhRef: React.RefObject<number>;
  /** Scroll vh at which the hero text starts sliding out. */
  heroOutStartVh?: number;
  /** Scroll vh at which the hero text finishes sliding out. */
  heroOutEndVh?: number;
  /** Scroll vh at which the about text starts sliding in. */
  aboutInStartVh?: number;
  /** Scroll vh at which the about text finishes sliding in. */
  aboutInEndVh?: number;
  /** Scroll vh at which the about text starts sliding out. */
  aboutOutStartVh?: number;
  /** Scroll vh at which the about text finishes sliding out. */
  aboutOutEndVh?: number;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function HeroText({
  scrollVhRef,
  heroOutStartVh = 0.2,
  heroOutEndVh = 1.2,
  aboutInStartVh = 1.8,
  aboutInEndVh = 2.6,
  aboutOutStartVh = 3.4,
  aboutOutEndVh = 4.0,
}: HeroTextProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const aboutLabelRef = useRef<HTMLParagraphElement>(null);
  const aboutHeadingRef = useRef<HTMLHeadingElement>(null);
  const aboutBodyRef = useRef<HTMLParagraphElement>(null);
  const aboutBody2Ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();

    let raf = 0;
    const tick = () => {
      const vh = scrollVhRef.current ?? 0;

      // ── Hero block: visible at 0, slides up + fades out ─────────
      const heroOut = clamp01(
        (vh - heroOutStartVh) / Math.max(1e-4, heroOutEndVh - heroOutStartVh),
      );
      const heroEased = curves.in(heroOut); // exit uses ease-in
      if (heroRef.current) {
        if (reduced) {
          heroRef.current.style.opacity = String(1 - heroOut);
          heroRef.current.style.transform = "translate(-50%, -50%)";
        } else {
          heroRef.current.style.opacity = String(1 - heroEased);
          // Exit lifts UP ~64px — a confident departure. Compose with
          // the centering translate so positioning isn't lost.
          heroRef.current.style.transform = `translate(-50%, -50%) translate3d(0, ${-heroEased * 64}px, 0)`;
        }
      }

      // ── About block: each element slides in from the right with stagger,
      //    then the whole group slides out upward.
      const aboutOut = clamp01(
        (vh - aboutOutStartVh) / Math.max(1e-4, aboutOutEndVh - aboutOutStartVh),
      );
      const aboutOutEased = curves.in(aboutOut);

      // Per-element staggered slide-in — label first, heading next, body last.
      // Each gets its own scroll window offset within the aboutIn range.
      const aboutRange = Math.max(1e-4, aboutInEndVh - aboutInStartVh);
      const staggerOffsets = [0, 0.15, 0.32, 0.45]; // vh offsets per element
      const aboutEls = [aboutLabelRef, aboutHeadingRef, aboutBodyRef, aboutBody2Ref];

      for (let i = 0; i < aboutEls.length; i++) {
        const el = aboutEls[i].current;
        if (!el) continue;
        const elStart = aboutInStartVh + staggerOffsets[i];
        const elIn = clamp01((vh - elStart) / aboutRange);
        const elInEased = curves.out(elIn);
        const inX = (1 - elInEased) * 48;
        const outY = aboutOutEased * -48;
        const opacity = elInEased * (1 - aboutOutEased);
        if (reduced) {
          el.style.opacity = String(opacity > 0.5 ? 1 : 0);
          el.style.transform = "translate3d(0, 0, 0)";
        } else {
          el.style.opacity = String(opacity);
          el.style.transform = `translate3d(${inX}px, ${outY}px, 0)`;
        }
      }

      // Parent group just needs to be visible (individual children drive
      // their own opacity/transform).
      if (aboutRef.current) {
        aboutRef.current.style.opacity = "1";
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    scrollVhRef,
    heroOutStartVh,
    heroOutEndVh,
    aboutInStartVh,
    aboutInEndVh,
    aboutOutStartVh,
    aboutOutEndVh,
  ]);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
      {/* Hero block — visual center anchored at the top-left rule-of-thirds
          crosshair (1/3, 1/3). translate(-50%, -50%) pulls the wrapper back
          so the title + subtitle straddle the crosshair. The heroRef wrapper
          handles scroll-driven exit (translate + opacity), while each child
          uses a CSS @keyframes intro animation (hero-intro) that plays once
          on mount and stagger sequentially. */}
      <div
        ref={heroRef}
        className="absolute flex flex-col items-start text-left text-zinc-900"
        style={{
          left: "33.333vw",
          top: "33.333vh",
          transform: "translate(-50%, -50%)",
          willChange: "transform, opacity",
        }}
      >
        <h1
          className="hero-intro hero-intro--title"
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: "clamp(2.75rem, 6.5vw, 5.75rem)",
            fontWeight: 300,
            fontVariationSettings: '"opsz" 144, "SOFT" 20',
            letterSpacing: "-0.025em",
            textTransform: "uppercase",
            lineHeight: 0.95,
            color: "#1c1c1f",
            margin: 0,
          }}
        >
          Ethan Orr
        </h1>
        <p
          className="hero-intro hero-intro--sub text-zinc-500"
          style={{
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontSize: "clamp(0.68rem, 0.82vw, 0.82rem)",
            fontWeight: 400,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            lineHeight: 1,
            margin: 0,
            marginTop: "1rem",
          }}
        >
          Engineer &nbsp;·&nbsp; Designer &nbsp;·&nbsp; Entrepreneur
        </p>
      </div>

      {/* About block — right-justified, anchored by right edge at 8vw from
          the viewport right so it never overflows. Vertically centered on
          the 2/3 crosshair. Slides in from the right. */}
      <div
        ref={aboutRef}
        className="absolute flex flex-col items-end text-right text-zinc-900"
        style={{
          right: "8vw",
          top: "50vh",
          transform: "translateY(-50%)",
          opacity: 0,
          willChange: "transform, opacity",
        }}
      >
        <p
          ref={aboutLabelRef}
          style={{
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontSize: "clamp(0.68rem, 0.82vw, 0.82rem)",
            fontWeight: 400,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "#7a6a4f",
            margin: 0,
            marginBottom: "0.9rem",
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          About
        </p>
        <h2
          ref={aboutHeadingRef}
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: "clamp(2rem, 4.2vw, 3.75rem)",
            fontWeight: 300,
            fontVariationSettings: '"opsz" 144, "SOFT" 20',
            letterSpacing: "-0.025em",
            textTransform: "uppercase",
            lineHeight: 0.95,
            color: "#1c1c1f",
            margin: 0,
            maxWidth: "11ch",
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          I build the unimaginable.
        </h2>
        <p
          ref={aboutBodyRef}
          className="text-zinc-600"
          style={{
            fontFamily: "var(--font-geist-sans), ui-sans-serif, sans-serif",
            fontSize: "clamp(0.9rem, 1.1vw, 1.05rem)",
            fontWeight: 300,
            lineHeight: 1.55,
            margin: 0,
            marginTop: "1.4rem",
            // Narrower than the heading so the copy wraps to more lines with
            // tighter justification.
            width: "34ch",
            textAlign: "justify",
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          Engineer, designer, entrepreneur — I build every layer, from the firmware
          on the microcontroller to the app on the screen. Idea to in-market —
          I take the whole thing across the line.
        </p>
        <p
          ref={aboutBody2Ref}
          className="text-zinc-600"
          style={{
            fontFamily: "var(--font-geist-sans), ui-sans-serif, sans-serif",
            fontSize: "clamp(0.9rem, 1.1vw, 1.05rem)",
            fontWeight: 300,
            lineHeight: 1.55,
            margin: 0,
            marginTop: "1rem",
            width: "34ch",
            textAlign: "justify",
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          Custom builds for founders and teams: first-generation prototypes at
          professional-grade quality, firmware to app — whatever the solution
          demands.
        </p>
      </div>
    </div>
  );
}
