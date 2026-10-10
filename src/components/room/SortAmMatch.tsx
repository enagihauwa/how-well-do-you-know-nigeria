"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCopy } from "@/lib/i18n/useCopy";
import type { SortAmView } from "@/lib/modes";
import type { RoomView } from "@/lib/room/engine";
import { HostNext } from "./HostNext";
import { MatchHeader } from "./MatchHeader";
import { RoundResults } from "./RoundResults";

interface SortAmMatchProps {
  room: RoomView;
  match: SortAmView;
  clockOffset: number;
  onAnswer: (order: string[]) => void;
  onNext: () => void;
}

/** Tap-to-order instead of drag and drop: works with one thumb, a keyboard and a screen reader. */
export function SortAmMatch({ room, match, clockOffset, onAnswer, onNext }: SortAmMatchProps) {
  const t = useCopy();
  const [picked, setPicked] = useState<{ index: number; order: string[] }>({ index: -1, order: [] });
  // A new question starts with nothing picked.
  const order = picked.index === match.index ? picked.order : [];
  const answering = match.phase === "answering";

  if (!match.item) return null;
  const options = match.item.options;
  const locked = match.myAnswer;

  const toggle = (option: string) => {
    const next = order.includes(option) ? order.filter((o) => o !== option) : [...order, option];
    setPicked({ index: match.index, order: next });
  };

  const positionOf = (option: string) => {
    const list = match.phase === "reveal" ? match.solution ?? [] : (locked ?? order);
    const i = list.indexOf(option);
    return i >= 0 ? i + 1 : null;
  };

  const shown = match.phase === "reveal" && match.solution ? match.solution : options;

  return (
    <>
      <MatchHeader
        view={room}
        clockOffset={clockOffset}
        title={t.modes["sort-am"].name}
        progress={t.quiz.questionOf(match.index + 1, match.total)}
        teamScores={match.teamScores}
        timer={answering ? { endsAt: match.endsAt, totalSeconds: match.answerMs / 1000 } : null}
        autoNextAt={answering ? undefined : match.endsAt}
      />

      <h1 key={match.index} className="anim-enter mt-5 text-balance text-2xl font-semibold leading-snug sm:text-3xl">
        {match.item.prompt}
      </h1>
      <p className="mt-1 text-sm font-semibold text-muted">
        {match.phase === "reveal" ? t.sort.correctOrder : t.sort.tapInOrder}
      </p>

      <ul className="mt-5 flex flex-col gap-3">
        {shown.map((option, i) => {
          const position = positionOf(option);
          const myPlace = locked ? locked.indexOf(option) : -1;
          const rightPlace = match.phase === "reveal" && myPlace === i;
          return (
            <li key={option} className="anim-enter" style={{ "--i": i } as React.CSSProperties}>
              <button
                type="button"
                disabled={!answering || locked !== null}
                onClick={() => toggle(option)}
                aria-pressed={position !== null && answering}
                className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus sm:p-4 ${
                  match.phase === "reveal"
                    ? rightPlace
                      ? "border-brand bg-brand-soft"
                      : "border-line bg-surface"
                    : position !== null
                      ? "border-gold bg-surface"
                      : "border-line bg-surface hover:border-brand"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${
                    position !== null ? "anim-pop bg-gold text-[#17201b]" : "bg-brand-soft text-brand-ink"
                  }`}
                >
                  {position ?? ""}
                </span>
                <span className="min-w-0 flex-1 text-base font-semibold sm:text-lg">{option}</span>
                {match.phase === "reveal" && locked && (
                  <span aria-hidden="true" className="shrink-0 text-xl font-semibold">
                    {rightPlace ? "✓" : "✗"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {answering && locked === null && (
        <div className="mt-4 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setPicked({ index: match.index, order: [] })}
            disabled={order.length === 0}
            className="flex-1 !px-3"
          >
            {t.sort.reset}
          </Button>
          <Button onClick={() => onAnswer(order)} disabled={order.length !== options.length} className="flex-1 !px-3">
            {t.sort.lock}
          </Button>
        </div>
      )}

      {answering && locked !== null && (
        <p role="status" className="mt-4 text-center text-sm font-semibold text-muted">
          {t.match.youLocked} · {t.match.answered(match.answeredCount, match.expectedCount)}
        </p>
      )}

      {match.phase === "reveal" && (
        <section className="mt-6">
          <RoundResults room={room} results={match.results} />
          <div className="mt-5">
            <HostNext isHost={room.hostId === room.you} onNext={onNext} />
          </div>
        </section>
      )}
    </>
  );
}
