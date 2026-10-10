"use client";

import { useState } from "react";

interface TimerBarProps {
  /** Local-clock time the timer reaches zero. Render with `key={endsAt}` so it restarts. */
  endsAt: number;
  totalSeconds: number;
  secondsLeft: number;
  /** Freezes the bar where it is, e.g. once the player has answered. */
  paused?: boolean;
}

const LOW_TIME_SECONDS = 3;

/**
 * The fill shrinks with a CSS transform animation, which the browser runs on the compositor at
 * the display's frame rate with no JavaScript per frame. React only re-renders once a second for
 * the number and the low-time colour.
 */
export function TimerBar({ endsAt, totalSeconds, secondsLeft, paused = false }: TimerBarProps) {
  // Measured once, when this deadline's bar mounts.
  const [remainingMs] = useState(() => Math.max(0, endsAt - Date.now()));
  const startFraction = Math.min(1, remainingMs / (totalSeconds * 1000));
  const isLow = secondsLeft <= LOW_TIME_SECONDS;

  return (
    <div className="flex items-center gap-3">
      {/* Progressbar values are not announced continuously, so screen readers aren't flooded. */}
      <div
        role="progressbar"
        aria-label="Time remaining"
        aria-valuemin={0}
        aria-valuemax={totalSeconds}
        aria-valuenow={secondsLeft}
        aria-valuetext={`${secondsLeft} ${secondsLeft === 1 ? "second" : "seconds"} left`}
        className="h-3 flex-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className={`timer-fill h-full w-full origin-left transition-colors ${isLow ? "bg-danger-fill" : "bg-brand"}`}
          style={
            {
              "--from": startFraction,
              animationDuration: `${remainingMs}ms`,
              animationPlayState: paused ? "paused" : "running",
            } as React.CSSProperties
          }
        />
      </div>
      <span
        aria-hidden="true"
        className={`w-14 text-right text-lg font-semibold tabular-nums ${isLow ? "text-danger-ink" : "text-brand-ink"}`}
      >
        {secondsLeft}s
      </span>
    </div>
  );
}
