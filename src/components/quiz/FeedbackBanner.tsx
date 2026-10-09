export type FeedbackKind = "correct" | "wrong" | "timeout";

interface FeedbackBannerProps {
  /** Null while the player is still answering. */
  kind: FeedbackKind | null;
  correctAnswer: string;
}

const styles: Record<FeedbackKind, string> = {
  correct: "border-brand/30 bg-brand-soft text-brand-deep",
  wrong:
    "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
  timeout:
    "border-gold/60 bg-amber-50 text-amber-900 dark:border-gold/40 dark:bg-amber-950/50 dark:text-amber-200",
};

const titles: Record<FeedbackKind, string> = {
  correct: "✓ Correct!",
  wrong: "✗ Not quite!",
  timeout: "⏱ Time's up!",
};

/** The wrapper is always rendered so the live region announces the feedback when it appears. */
export function FeedbackBanner({ kind, correctAnswer }: FeedbackBannerProps) {
  return (
    <div role="status" aria-live="polite" className="min-h-[4.5rem]">
      {kind && (
        <div className={`rounded-2xl border px-4 py-3 text-center ${styles[kind]}`}>
          <p className="text-lg font-extrabold">{titles[kind]}</p>
          {kind !== "correct" && (
            <p className="mt-0.5 text-sm">
              The correct answer is <strong>{correctAnswer}</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
