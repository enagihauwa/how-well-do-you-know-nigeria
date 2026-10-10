import { useCopy } from "@/lib/i18n/useCopy";

export type FeedbackKind = "correct" | "wrong" | "timeout";

interface FeedbackBannerProps {
  /** Null while the player is still answering. */
  kind: FeedbackKind | null;
  correctAnswer: string;
}

const styles: Record<FeedbackKind, string> = {
  correct: "border-brand/30 bg-brand-soft text-brand-deep",
  wrong:
    "border-danger-fill/40 bg-danger-soft text-danger-ink",
  timeout:
    "border-gold/60 bg-gold-soft text-gold-ink",
};

/** The wrapper is always rendered so the live region announces the feedback when it appears. */
export function FeedbackBanner({ kind, correctAnswer }: FeedbackBannerProps) {
  const t = useCopy();
  return (
    <div role="status" aria-live="polite" className="min-h-[4.5rem]">
      {kind && (
        <div className={`rounded-2xl border px-4 py-3 text-center ${styles[kind]}`}>
          <p className="text-lg font-semibold">{t.feedback[kind]}</p>
          {kind !== "correct" && (
            <p className="mt-0.5 text-sm">
              {t.feedback.correctAnswerIs} <strong>{correctAnswer}</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
