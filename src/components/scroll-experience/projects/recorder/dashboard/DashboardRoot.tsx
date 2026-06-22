"use client";

import { useCallback, useState } from "react";
import type { SessionData } from "./lib/dashboardTypes";
import { MetadataHeader } from "./MetadataHeader";
import { SpeakerChips } from "./SpeakerChips";
import { AudioPlayer } from "./AudioPlayer";
import { Tabs, type TabKey } from "./Tabs";
import { TranscriptPanel } from "./TranscriptPanel";
import { AiNotesPanel } from "./AiNotesPanel";
import { dismissNotesLeader } from "../notesLeaderSignal";

/** Fixed-px dashboard (rendered at a comfortable resolution, scaled onto the
 *  laptop lid via drei <Html scale>). Shared header + audio above tabbed
 *  Transcript / AI-notes panels, each independently scrollable. */
export function DashboardRoot({ session }: { session: SessionData }) {
  const [tab, setTab] = useState<TabKey>("transcript");
  const handleTab = useCallback((next: TabKey) => {
    setTab(next);
    if (next === "notes") dismissNotesLeader(); // hint followed → fade the leader
  }, []);
  return (
    <div
      className="dashboard flex flex-col gap-4 rounded-xl bg-gray-50 p-6"
      style={{ width: 1100, height: 720 }}
    >
      <MetadataHeader meta={session.meta} />
      <SpeakerChips speakers={session.speakers} />
      <AudioPlayer src={session.audioSrc} initialSeekSec={session.initialSeekSec} />
      <Tabs active={tab} onChange={handleTab} />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {tab === "transcript" ? (
          <TranscriptPanel
            transcript={session.transcript}
            questions={session.questions}
            speakers={session.speakers}
          />
        ) : (
          <AiNotesPanel markdown={session.aiNotesMarkdown} />
        )}
      </div>
    </div>
  );
}
