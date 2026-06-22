"use client";

import { useEffect, useRef } from "react";
import { subscribeAudioSeek } from "./lib/audioSeek";

/**
 * The single <audio> for the session. Subscribes to the seek bus so {{ts}}
 * pills can jump it; stashes a seek requested before metadata loads and drains
 * it on `loadedmetadata`. Ported from the admin player, Firebase stripped.
 */
export function AudioPlayer({ src, initialSeekSec }: { src: string; initialSeekSec?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekRef = useRef<{ totalSec: number; play: boolean } | null>(null);

  useEffect(
    () =>
      subscribeAudioSeek(({ totalSec, play }) => {
        const audio = audioRef.current;
        const wantPlay = play ?? true;
        if (!audio || audio.readyState < 1) {
          pendingSeekRef.current = { totalSec, play: wantPlay };
          return;
        }
        audio.currentTime = clamp(totalSec, 0, isFinite(audio.duration) ? audio.duration : totalSec);
        if (wantPlay) audio.play().catch(() => {});
      }),
    [],
  );

  // If metadata is already loaded on mount (cached audio races past the
  // onLoadedMetadata handler), apply the autoscroll here instead.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audio.readyState < 1 || pendingSeekRef.current) return;
    if (initialSeekSec && initialSeekSec > 0 && audio.currentTime < 0.5) {
      audio.currentTime = clamp(initialSeekSec, 0, isFinite(audio.duration) ? audio.duration : initialSeekSec);
    }
  }, [initialSeekSec]);

  const onLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = isFinite(audio.duration) ? audio.duration : Infinity;
    const pending = pendingSeekRef.current;
    if (pending) {
      pendingSeekRef.current = null;
      audio.currentTime = clamp(pending.totalSec, 0, dur);
      if (pending.play) audio.play().catch(() => {});
      return;
    }
    // Autoscroll: position the playhead at the meaningful part (no autoplay).
    if (initialSeekSec && initialSeekSec > 0) audio.currentTime = clamp(initialSeekSec, 0, dur);
  };

  return <audio ref={audioRef} controls src={src} className="w-full" onLoadedMetadata={onLoadedMetadata} />;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
