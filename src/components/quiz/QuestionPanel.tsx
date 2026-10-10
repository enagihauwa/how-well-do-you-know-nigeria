"use client";

import { useEffect, useRef } from "react";
import { SECONDS_PER_QUESTION } from "@/lib/quiz/scoring";
import { useCountdown } from "@/lib/quiz/useCountdown";
import { useCopy } from "@/lib/i18n/useCopy";
import type { Phase, Question } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { AnswerOption, type AnswerStatus } from "./AnswerOption";
import { FeedbackBanner, type FeedbackKind } from "./FeedbackBanner";
import { TimerBar } from "./TimerBar";

const LETTERS = ["A", "B", "C", "D"];
const SHORTCUT_KEYS = [
  ["a", "1"],
  ["b", "2"],
  ["c", "3"],
  ["d", "4"],
];

interface QuestionPanelProps {
  question: Question;
  phase: Phase;
  selectedAnswer: string | null;
  timedOut: boolean;
  isLast: boolean;
  onAnswer: (option: string) => void;
  /** Reveal now. Only offered once the player has picked. */
  onCheck: () => void;
  onTimeUp: () => void;
  onNext: () => void;
}

/**
 * One question: timer, options, feedback and Next. The pick can change until the reveal (time
 * running out, or Check answer). Render it with `key={questionIndex}`
 * so the countdown and focus start fresh for every question. The reducer owns scoring
 * and phase; this component only reports events.
 */
export function QuestionPanel({
  question,
  phase,
  selectedAnswer,
  timedOut,
  isLast,
  onAnswer,
  onCheck,
  onTimeUp,
  onNext,
}: QuestionPanelProps) {
  const t = useCopy();
  const answering = phase === "answering";
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const { endsAt, secondsLeft } = useCountdown({
    seconds: SECONDS_PER_QUESTION,
    running: answering,
    onExpire: onTimeUp,
  });

  // Screen-reader users hear the new question; keyboard users land on Next after feedback.
  useEffect(() => {
    // On short screens the previous question may have scrolled down to reach NEXT.
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!answering) nextRef.current?.focus();
  }, [answering]);

  // Keyboard shortcuts: A–D or 1–4 pick an option while answering.
  useEffect(() => {
    if (!answering) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const index = SHORTCUT_KEYS.findIndex((keys) => keys.includes(key));
      if (index >= 0 && question.options[index]) onAnswer(question.options[index]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [answering, onAnswer, question.options]);

  const feedbackKind: FeedbackKind | null = answering
    ? null
    : timedOut
      ? "timeout"
      : selectedAnswer === question.answer
        ? "correct"
        : "wrong";

  const statusOf = (option: string): AnswerStatus => {
    if (answering) return option === selectedAnswer ? "locked" : "idle";
    if (option === question.answer) return "correct";
    if (option === selectedAnswer) return "wrong";
    return "dimmed";
  };

  return (
    <>
      <TimerBar endsAt={endsAt} totalSeconds={SECONDS_PER_QUESTION} secondsLeft={secondsLeft} paused={!answering} />

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-balance text-2xl font-semibold leading-snug focus:outline-none sm:text-3xl"
      >
        {question.question}
      </h1>

      <ul className="mt-5 flex flex-col gap-3">
        {question.options.map((option, i) => (
          <li key={option}>
            <AnswerOption
              letter={LETTERS[i]}
              text={option}
              status={statusOf(option)}
              disabled={!answering}
              onSelect={() => onAnswer(option)}
            />
          </li>
        ))}
      </ul>

      <p className="mt-3 min-h-5 text-center text-sm text-muted">{answering && selectedAnswer !== null && t.quiz.changeHint}</p>

      {/* Always rendered: it is a live region, so the result is announced when it appears. */}
      <div className="mt-2">
        <FeedbackBanner kind={feedbackKind} correctAnswer={question.answer} />
      </div>

      <div className="mt-4 min-h-14">
        {answering && selectedAnswer !== null && (
          <Button onClick={onCheck} className="anim-enter w-full">
            {t.quiz.check}
          </Button>
        )}
        {!answering && (
          <Button ref={nextRef} onClick={onNext} className="w-full">
            {isLast ? t.common.seeResults : t.common.next}
          </Button>
        )}
      </div>
    </>
  );
}
