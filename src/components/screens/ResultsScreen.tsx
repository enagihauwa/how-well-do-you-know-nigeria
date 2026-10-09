"use client";

import { useEffect, useRef } from "react";
import { categories } from "@/data/categories";
import {
  MAX_SCORE,
  QUESTIONS_PER_GAME,
  getCorrectCount,
  getResultMessage,
} from "@/lib/quiz/scoring";
import type { CategoryId } from "@/lib/types";
import { Confetti } from "@/components/results/Confetti";
import { Trophy } from "@/components/results/Trophy";
import { Button } from "@/components/ui/Button";

interface ResultsScreenProps {
  score: number;
  category: CategoryId | null;
  onPlayAgain: () => void;
  onChooseCategory: () => void;
}

export function ResultsScreen({
  score,
  category,
  onPlayAgain,
  onChooseCategory,
}: ResultsScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // The last question may have scrolled down to reach the button; start the results at the top.
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const categoryLabel = categories.find((c) => c.id === category)?.label;
  const correct = getCorrectCount(score);
  const percent = (score / MAX_SCORE) * 100;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-6 py-8 text-center">
      <div className="relative flex h-36 w-full items-center justify-center sm:h-40">
        <Confetti />
        <Trophy className="relative h-24 w-auto drop-shadow-sm sm:h-28" />
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-base font-extrabold uppercase tracking-widest text-foreground/60 focus:outline-none"
      >
        Quiz completed
      </h1>
      <div aria-hidden="true" className="mt-3 h-1 w-14 rounded-full bg-gold" />

      {categoryLabel && (
        <p className="mt-4 rounded-full bg-brand-soft px-4 py-1 text-sm font-bold text-brand">
          {categoryLabel}
        </p>
      )}

      <section
        aria-label="Your result"
        className="mt-6 w-full rounded-3xl border border-foreground/10 bg-white px-6 py-7 shadow-sm"
      >
        <p className="text-2xl font-extrabold text-brand-dark sm:text-3xl">
          {getResultMessage(score)}
        </p>

        <p className="mt-3 flex items-baseline justify-center gap-2">
          <span className="text-7xl font-extrabold leading-none tracking-tight text-brand sm:text-8xl">
            {score}
          </span>
          <span className="text-2xl font-bold text-foreground/50">/ {MAX_SCORE}</span>
        </p>

        <div
          role="progressbar"
          aria-label="Final score"
          aria-valuemin={0}
          aria-valuemax={MAX_SCORE}
          aria-valuenow={score}
          aria-valuetext={`${score} out of ${MAX_SCORE} points`}
          className="mt-5 h-4 w-full overflow-hidden rounded-full bg-foreground/10"
        >
          <div
            className="score-bar-fill h-full rounded-full bg-brand"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-4 text-base font-semibold text-foreground/70">
          <span className="font-extrabold text-brand">{correct}</span> of {QUESTIONS_PER_GAME}{" "}
          correct
        </p>
      </section>

      <div className="mt-6 flex w-full flex-col gap-3">
        <Button onClick={onPlayAgain} className="w-full">
          PLAY AGAIN
          <span aria-hidden="true">↻</span>
        </Button>
        <Button variant="secondary" onClick={onChooseCategory} className="w-full">
          CHOOSE ANOTHER CATEGORY
        </Button>
      </div>
    </main>
  );
}
