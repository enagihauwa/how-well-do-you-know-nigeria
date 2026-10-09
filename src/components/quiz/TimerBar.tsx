interface TimerBarProps {
  remainingMs: number;
  totalSeconds: number;
}

const LOW_TIME_SECONDS = 3;

export function TimerBar({ remainingMs, totalSeconds }: TimerBarProps) {
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const fraction = Math.min(1, Math.max(0, remainingMs / (totalSeconds * 1000)));
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
        className="h-3 flex-1 overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-100 motion-safe:ease-linear ${
            isLow ? "bg-danger-fill" : "bg-brand"
          }`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span
        aria-hidden="true"
        className={`w-14 text-right text-lg font-extrabold tabular-nums ${
          isLow ? "text-danger-ink" : "text-brand-ink"
        }`}
      >
        {secondsLeft}s
      </span>
    </div>
  );
}
