"use client";

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentVh: number;
  onTogglePlay: () => void;
  onSkipToStart: () => void;
  onSkipToEnd: () => void;
}

export function PlaybackControls({
  isPlaying,
  currentVh,
  onTogglePlay,
  onSkipToStart,
  onSkipToEnd,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onSkipToStart}
        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"
        title="Skip to start"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="1" y="2" width="2" height="8" />
          <polygon points="11,2 5,6 11,10" />
        </svg>
      </button>

      <button
        onClick={onTogglePlay}
        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="2" width="3" height="8" />
            <rect x="7" y="2" width="3" height="8" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <polygon points="2,1 11,6 2,11" />
          </svg>
        )}
      </button>

      <button
        onClick={onSkipToEnd}
        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"
        title="Skip to end"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <polygon points="1,2 7,6 1,10" />
          <rect x="9" y="2" width="2" height="8" />
        </svg>
      </button>

      <span className="ml-2 text-[11px] text-zinc-400 tabular-nums min-w-[60px]">
        {currentVh.toFixed(1)} vh
      </span>
    </div>
  );
}
