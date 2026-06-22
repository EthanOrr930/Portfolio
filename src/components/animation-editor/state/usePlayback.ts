"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UsePlaybackOptions {
  maxVh: number;
  speed?: number; // vh per second, default 0.5
  onVhChange: (vh: number) => void;
}

export function usePlayback({ maxVh, speed = 0.5, onVhChange }: UsePlaybackOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentVhRef = useRef<number>(0);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const tick = useCallback(
    (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      currentVhRef.current += dt * speed;

      if (currentVhRef.current >= maxVh) {
        currentVhRef.current = maxVh;
        onVhChange(maxVh);
        stop();
        return;
      }

      onVhChange(currentVhRef.current);
      rafRef.current = requestAnimationFrame(tick);
    },
    [maxVh, speed, onVhChange, stop],
  );

  const play = useCallback(
    (fromVh: number) => {
      if (maxVh <= 0) return;
      currentVhRef.current = fromVh;
      lastTimeRef.current = 0;
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    },
    [maxVh, tick],
  );

  const skipToStart = useCallback(() => {
    stop();
    onVhChange(0);
  }, [stop, onVhChange]);

  const skipToEnd = useCallback(() => {
    stop();
    onVhChange(maxVh);
  }, [stop, onVhChange, maxVh]);

  const togglePlay = useCallback(
    (currentVh: number) => {
      if (isPlaying) {
        stop();
      } else {
        // If at the end, restart from beginning
        const startVh = currentVh >= maxVh ? 0 : currentVh;
        play(startVh);
      }
    },
    [isPlaying, maxVh, play, stop],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { isPlaying, play, stop, skipToStart, skipToEnd, togglePlay };
}
