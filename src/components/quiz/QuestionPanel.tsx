"use client";

import { useEffect, useRef } from "react";
import { SECONDS_PER_QUESTION } from "@/lib/quiz/scoring";
import { useCountdown } from "@/lib/quiz/useCountdown";
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
  onTimeUp: () => void;
  onNext: () => void;
}

/**
 * One question: timer, options, feedback and Next. Render it with `key={questionIndex}`
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
  onTimeUp,
  onNext,
}: QuestionPanelProps) {
  const answering = phase === "answering";
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const remainingMs = useCountdown({
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
    if (answering) return "idle";
    if (option === question.answer) return "correct";
    if (option === selectedAnswer) return "wrong";
    return "dimmed";
  };

  return (
    <>
      <TimerBar remainingMs={remainingMs} totalSeconds={SECONDS_PER_QUESTION} />

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-balance text-2xl font-extrabold leading-snug focus:outline-none sm:text-3xl"
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

      <div className="mt-4">
        <FeedbackBanner kind={feedbackKind} correctAnswer={question.answer} />
      </div>

      <div className="mt-4 min-h-14">
        {!answering && (
          <Button ref={nextRef} onClick={onNext} className="w-full">
            {isLast ? "SEE RESULTS" : "NEXT"}
            <span aria-hidden="true">→</span>
          </Button>
        )}
      </div>
    </>
  );
}
