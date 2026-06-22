"use client";

// TEMP dev harness (owner: ethan, 2026-06) — renders the recording-detail
// dashboard standalone (no 3D) to verify layout, tabs, AI-notes expand, pills.

import { DashboardRoot } from "@/components/scroll-experience/projects/recorder/dashboard/DashboardRoot";
import { SAMPLE_SESSION } from "@/components/scroll-experience/projects/recorder/dashboard/lib/sessionData";

export default function DashboardTestPage() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#d8d0c6", overflow: "auto" }}>
      <div style={{ transform: "scale(0.42)", transformOrigin: "top left" }}>
        <div style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.25)", borderRadius: 12, width: 1100 }}>
          <DashboardRoot session={SAMPLE_SESSION} />
        </div>
      </div>
    </div>
  );
}
