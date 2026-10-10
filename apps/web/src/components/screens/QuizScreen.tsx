import { categories } from "@naija/game/data/categories";
import { useCopy } from "@/lib/i18n/useCopy";
import type { QuizState } from "@naija/game/types";
import { QuestionPanel } from "@/components/quiz/QuestionPanel";
import { TopBar } from "@/components/ui/TopBar";

interface QuizScreenProps {
  state: QuizState;
  onBack: () => void;
  onAnswer: (option: string) => void;
  onCheck: () => void;
  onTimeUp: () => void;
  onNext: () => void;
}

export function QuizScreen({ state, onBack, onAnswer, onCheck, onTimeUp, onNext }: QuizScreenProps) {
  const t = useCopy();
  const question = state.questions[state.currentIndex];
  if (!question) return null;

  const total = state.questions.length;
  const categoryLabel = categories.find((c) => c.id === state.category)?.label;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-4 sm:px-6 sm:py-6">
      <TopBar back={{ label: t.common.back, onClick: onBack }} />

      <p className="mt-4 text-sm font-medium text-muted">
        <span className="font-semibold text-brand-ink">{categoryLabel}</span> ·{" "}
        {t.quiz.questionOf(state.currentIndex + 1, total)}
      </p>

      {/* key: a fresh timer, focus and local state for every question */}
      <QuestionPanel
        key={state.currentIndex}
        question={question}
        phase={state.phase}
        selectedAnswer={state.selectedAnswer}
        timedOut={state.timedOut}
        isLast={state.currentIndex === total - 1}
        onAnswer={onAnswer}
        onCheck={onCheck}
        onTimeUp={onTimeUp}
        onNext={onNext}
      />
    </main>
  );
}
