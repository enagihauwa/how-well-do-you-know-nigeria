export type AnswerStatus = "idle" | "correct" | "wrong" | "dimmed";

interface AnswerOptionProps {
  letter: string;
  text: string;
  status: AnswerStatus;
  disabled: boolean;
  onSelect: () => void;
}

const buttonStyles: Record<AnswerStatus, string> = {
  idle: "border-foreground/10 bg-white hover:border-brand hover:bg-brand-soft/50",
  correct: "border-brand bg-brand-soft",
  wrong: "border-rose-300 bg-rose-50",
  dimmed: "border-foreground/10 bg-white opacity-60",
};

const letterStyles: Record<AnswerStatus, string> = {
  idle: "bg-brand-soft text-brand",
  correct: "bg-brand text-white",
  wrong: "bg-rose-700 text-white",
  dimmed: "bg-brand-soft text-brand",
};

export function AnswerOption({ letter, text, status, disabled, onSelect }: AnswerOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 p-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold sm:gap-4 sm:p-4 ${buttonStyles[status]} ${
        disabled ? "cursor-default" : "cursor-pointer"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-extrabold ${letterStyles[status]}`}
      >
        {letter}
      </span>
      <span className="min-w-0 flex-1 text-base font-semibold sm:text-lg">
        <span className="sr-only">{`Option ${letter}: `}</span>
        {text}
        {status === "correct" && <span className="sr-only"> (correct answer)</span>}
        {status === "wrong" && <span className="sr-only"> (your answer, incorrect)</span>}
      </span>
      {status === "correct" && (
        <span aria-hidden="true" className="shrink-0 text-xl font-extrabold text-brand">
          ✓
        </span>
      )}
      {status === "wrong" && (
        <span aria-hidden="true" className="shrink-0 text-xl font-extrabold text-rose-700">
          ✗
        </span>
      )}
    </button>
  );
}
