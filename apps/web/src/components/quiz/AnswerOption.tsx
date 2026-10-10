/** `locked`: the player's current pick, before the reveal. They can still change it. */
export type AnswerStatus = "idle" | "locked" | "correct" | "wrong" | "dimmed";

interface AnswerOptionProps {
  letter: string;
  text: string;
  status: AnswerStatus;
  disabled: boolean;
  onSelect: () => void;
}

const buttonStyles: Record<AnswerStatus, string> = {
  idle: "border-line bg-surface hover:border-brand",
  locked: "border-gold bg-gold-soft",
  correct: "border-brand bg-brand-soft",
  wrong: "border-danger-fill bg-danger-soft",
  dimmed: "border-line bg-surface opacity-60",
};

const letterStyles: Record<AnswerStatus, string> = {
  idle: "bg-surface-2 text-muted",
  locked: "bg-gold text-[#17201b]",
  correct: "bg-brand text-on-brand",
  wrong: "bg-danger-ink text-surface",
  dimmed: "bg-surface-2 text-muted",
};

export function AnswerOption({ letter, text, status, disabled, onSelect }: AnswerOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus sm:gap-4 sm:p-4 ${buttonStyles[status]} ${
        disabled ? "cursor-default" : "cursor-pointer"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${letterStyles[status]}`}
      >
        {letter}
      </span>
      <span className="min-w-0 flex-1 text-base font-medium sm:text-lg">
        <span className="sr-only">{`Option ${letter}: `}</span>
        {text}
        {status === "locked" && <span className="sr-only"> (your pick)</span>}
        {status === "correct" && <span className="sr-only"> (correct answer)</span>}
        {status === "wrong" && <span className="sr-only"> (your answer, incorrect)</span>}
      </span>
      {status === "correct" && (
        <span aria-hidden="true" className="shrink-0 text-xl font-semibold text-brand-ink">
          ✓
        </span>
      )}
      {status === "wrong" && (
        <span aria-hidden="true" className="shrink-0 text-xl font-semibold text-danger-ink">
          ✗
        </span>
      )}
    </button>
  );
}
