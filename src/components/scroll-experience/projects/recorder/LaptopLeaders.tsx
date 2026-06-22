"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { LeaderRef } from "./LaptopLeaderOverlay";
import { onNotesLeaderDismiss } from "./notesLeaderSignal";

const LABEL = "VIEW AI NOTES";
const LEAD = 110; // px the label sits left of the button
const RISE = 78; // px the label sits above the button
const PAD = 18; // keep the label inside the viewport
const SHOW_DELAY = 1.0; // beat after the laptop settles before the leader fades in

interface LaptopLeadersProps {
  live: boolean;
  leaders: LeaderRef[];
}

/** One leader attached to the live AI Notes tab button (via its on-screen rect,
 *  so it tracks the button exactly). Shown once the laptop settles; fades out
 *  when the visitor opens the AI Notes tab. Renders no 3D. */
export function LaptopLeaders({ live, leaders }: LaptopLeadersProps) {
  const dismissed = useRef(false);
  const liveStart = useRef(0);
  useEffect(() => onNotesLeaderDismiss(() => (dismissed.current = true)), []);

  useFrame((state) => {
    const leader = leaders[0];
    if (!live) liveStart.current = 0;
    else if (liveStart.current === 0) liveStart.current = state.clock.elapsedTime;
    const armed = live && state.clock.elapsedTime - liveStart.current >= SHOW_DELAY;
    const btn = document.querySelector('[data-leader-anchor="notes"]') as HTMLElement | null;
    const r = btn?.getBoundingClientRect();
    if (!armed || dismissed.current || !r || r.width === 0) return setOpacity(leader, 0);
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const lx = clamp(x - LEAD, PAD, window.innerWidth - PAD);
    writeLeader(leader, x, y, lx, y - RISE, LABEL);
  });

  return null;
}

/** Leader line button→label; label is right-justified so text runs left, away. */
function writeLeader(ref: LeaderRef, x: number, y: number, lx: number, ly: number, text: string): void {
  const line = ref.line.current;
  if (line) {
    line.setAttribute("x1", String(x));
    line.setAttribute("y1", String(y));
    line.setAttribute("x2", String(lx));
    line.setAttribute("y2", String(ly));
    line.style.opacity = "1";
  }
  const label = ref.label.current;
  if (label) {
    if (label.textContent !== text) label.textContent = text;
    // Right-justify (text runs left, away from the button) unless that clips the
    // left edge — then left-justify so it stays on-screen.
    const runLeft = lx - label.offsetWidth - PAD >= 0;
    label.style.left = `${lx}px`;
    label.style.top = `${ly}px`;
    label.style.transform = `translateY(-50%)${runLeft ? " translateX(-100%)" : ""}`;
    label.style.opacity = "1";
  }
}

function setOpacity(ref: LeaderRef, o: number): void {
  if (ref.line.current) ref.line.current.style.opacity = String(o);
  if (ref.label.current) ref.label.current.style.opacity = String(o);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
