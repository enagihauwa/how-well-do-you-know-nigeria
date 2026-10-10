"use client";

import { useEffect, useRef, useState } from "react";
import type { Award } from "@naija/game/progress/progress";
import { AwardCard } from "@/components/account/AwardCard";
import { submitSolo } from "@/lib/account/account";
import { categories } from "@naija/game/data/categories";
import {
  MAX_SCORE,
  QUESTIONS_PER_GAME,
  getCorrectCount,
} from "@naija/game/quiz/scoring";
import { useCopy } from "@/lib/i18n/useCopy";
import type { CategoryId } from "@naija/game/types";
import { Confetti } from "@/components/results/Confetti";
import { Trophy } from "@/components/results/Trophy";
import { Button } from "@/components/ui/Button";
import { TopBar } from "@/components/ui/TopBar";

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
  const t = useCopy();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // The last question may have scrolled down to reach the button; start the results at the top.
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  // Report the quiz once (the ref survives React's development double-run of effects).
  const [award, setAward] = useState<Award | null>(null);
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    void submitSolo({ correct: getCorrectCount(score), total: QUESTIONS_PER_GAME, score }).then(setAward);
  }, [score]);

  const categoryLabel = categories.find((c) => c.id === category)?.label;
  const correct = getCorrectCount(score);
  const percent = (score / MAX_SCORE) * 100;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-4 text-center sm:px-6 sm:py-6">
      <TopBar title={categoryLabel} />
      <div className="relative mt-4 flex h-36 w-full items-center justify-center sm:h-40">
        <Confetti />
        <Trophy className="relative h-24 w-auto sm:h-28" />
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-base font-semibold text-muted focus:outline-none"
      >
        {t.results.completed}
      </h1>

      <section
        aria-label="Your result"
        className="mt-6 w-full rounded-3xl border border-line bg-surface px-6 py-7"
      >
        <p className="font-display text-2xl font-semibold text-brand-deep sm:text-3xl">
          {t.results.message(score)}
        </p>

        <p className="mt-3 flex items-baseline justify-center gap-2">
          <span className="font-display text-7xl font-bold leading-none text-brand-ink sm:text-8xl">
            {score}
          </span>
          <span className="text-2xl font-semibold text-muted">/ {MAX_SCORE}</span>
        </p>

        <div
          role="progressbar"
          aria-label="Final score"
          aria-valuemin={0}
          aria-valuemax={MAX_SCORE}
          aria-valuenow={score}
          aria-valuetext={`${score} out of ${MAX_SCORE} points`}
          className="mt-5 h-4 w-full overflow-hidden rounded-full bg-line dark:bg-surface-2"
        >
          <div
            className="score-bar-fill h-full rounded-full bg-brand"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-4 text-base font-semibold text-muted">
          <span className="font-semibold text-brand-ink">{correct}</span> of {QUESTIONS_PER_GAME}{" "}
          {t.results.correctOf}
        </p>
      </section>

      {award && (
        <div className="mt-4 w-full">
          <AwardCard award={award} solo />
        </div>
      )}

      <div className="mt-6 flex w-full flex-col gap-3">
        <Button onClick={onPlayAgain} className="w-full">
          {t.results.playAgain}
        </Button>
        <Button variant="secondary" onClick={onChooseCategory} className="w-full">
          {t.results.chooseCategory}
        </Button>
      </div>
    </main>
  );
}
