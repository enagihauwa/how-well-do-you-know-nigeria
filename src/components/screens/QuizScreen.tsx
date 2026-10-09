import { categories } from "@/data/categories";
import type { QuizState } from "@/lib/types";
import { QuestionPanel } from "@/components/quiz/QuestionPanel";

interface QuizScreenProps {
  state: QuizState;
  onBack: () => void;
  onAnswer: (option: string) => void;
  onTimeUp: () => void;
  onNext: () => void;
}

export function QuizScreen({ state, onBack, onAnswer, onTimeUp, onNext }: QuizScreenProps) {
  const question = state.questions[state.currentIndex];
  if (!question) return null;

  const total = state.questions.length;
  const categoryLabel = categories.find((c) => c.id === state.category)?.label;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-6 py-6">
      <div className="flex items-center justify-between gap-3 pr-10 sm:pr-0">
        <button
          type="button"
          onClick={onBack}
          className="-ml-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-base font-semibold text-brand-ink transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <p className="text-sm font-bold text-brand-ink">{categoryLabel}</p>
      </div>

      <p className="mt-4 text-sm font-extrabold uppercase tracking-widest text-foreground/65 dark:text-foreground/60">
        Question {state.currentIndex + 1} of {total}
      </p>
      <div aria-hidden="true" className="mt-2 mb-5 h-1 w-14 rounded-full bg-gold" />

      {/* key: a fresh timer, focus and local state for every question */}
      <QuestionPanel
        key={state.currentIndex}
        question={question}
        phase={state.phase}
        selectedAnswer={state.selectedAnswer}
        timedOut={state.timedOut}
        isLast={state.currentIndex === total - 1}
        onAnswer={onAnswer}
        onTimeUp={onTimeUp}
        onNext={onNext}
      />
    </main>
  );
}
