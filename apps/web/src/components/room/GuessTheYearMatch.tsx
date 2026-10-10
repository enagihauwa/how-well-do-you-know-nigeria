"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCopy } from "@/lib/i18n/useCopy";
import type { GuessTheYearView } from "@naija/game/modes";
import { MAX_YEAR, MIN_YEAR } from "@naija/game/modes/guessTheYear";
import type { RoomView } from "@naija/game/room/engine";
import { HostNext } from "./HostNext";
import { MatchHeader } from "./MatchHeader";
import { RoundResults } from "./RoundResults";

interface GuessTheYearMatchProps {
  room: RoomView;
  match: GuessTheYearView;
  clockOffset: number;
  onAnswer: (year: number) => void;
  onNext: () => void;
}

export function GuessTheYearMatch({ room, match, clockOffset, onAnswer, onNext }: GuessTheYearMatchProps) {
  const t = useCopy();
  // Keyed by question, so each question starts with an empty field.
  const [typed, setTyped] = useState({ index: -1, value: "" });
  const draft = typed.index === match.index ? typed.value : "";
  const answering = match.phase === "answering";
  const year = Number(draft);
  const valid = Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;

  if (!match.item) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) onAnswer(year);
  };

  const mine = match.results.find((r) => r.playerId === room.you);

  return (
    <>
      <MatchHeader
        view={room}
        clockOffset={clockOffset}
        title={t.modes["guess-the-year"].name}
        progress={t.quiz.questionOf(match.index + 1, match.total)}
        teamScores={match.teamScores}
        timer={answering ? { endsAt: match.endsAt, totalSeconds: match.answerMs / 1000 } : null}
        autoNextAt={answering ? undefined : match.endsAt}
      />

      <h1 key={`q-${match.index}`} className="anim-enter mt-5 text-balance text-2xl font-semibold leading-snug sm:text-3xl">
        {match.item.prompt}
      </h1>

      {answering && match.myAnswer === null && (
        // key: a fresh, empty field for each question
        <form key={`f-${match.index}`} onSubmit={submit} className="anim-enter mt-6 flex gap-2">
          <label htmlFor="year" className="sr-only">
            {t.year.placeholder}
          </label>
          <input
            id="year"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={draft}
            onChange={(e) => setTyped({ index: match.index, value: e.target.value.replace(/\D/g, "") })}
            placeholder={t.year.placeholder}
            autoComplete="off"
            enterKeyHint="done"
            className="min-h-16 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-center text-3xl font-semibold tabular-nums placeholder:text-muted focus:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-focus"
          />
          <Button type="submit" disabled={!valid} className="shrink-0 !px-5">
            {t.year.lock}
          </Button>
        </form>
      )}

      {answering && match.myAnswer !== null && (
        <p role="status" className="anim-pop mt-6 rounded-2xl border border-gold bg-surface p-5 text-center">
          <span className="block text-4xl font-semibold tabular-nums">{match.myAnswer}</span>
          <span className="mt-1 block text-sm font-semibold text-muted">
            {t.match.youLocked} · {t.match.answered(match.answeredCount, match.expectedCount)}
          </span>
        </p>
      )}

      {match.phase === "reveal" && match.solution !== null && (
        <section className="mt-6">
          <div className="anim-pop rounded-3xl border border-brand bg-brand-soft p-5 text-center">
            <p className="text-sm font-semibold text-brand-deep">{t.year.answerWas}</p>
            <p className="text-5xl font-semibold tabular-nums text-brand-deep">{match.solution}</p>
            {mine?.answer != null && (
              <p className="mt-1 text-sm font-semibold text-brand-deep">
                {mine.answer === match.solution ? t.year.exact : t.year.off(Math.abs(mine.answer - match.solution))}
              </p>
            )}
          </div>
          <div className="mt-4">
            <RoundResults room={room} results={match.results} format={(y) => String(y)} />
          </div>
          <div className="mt-5">
            <HostNext isHost={room.hostId === room.you} onNext={onNext} />
          </div>
        </section>
      )}
    </>
  );
}
