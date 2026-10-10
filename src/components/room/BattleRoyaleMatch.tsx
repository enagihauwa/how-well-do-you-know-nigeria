"use client";

import { AnswerOption, type AnswerStatus } from "@/components/quiz/AnswerOption";
import { TimerBar } from "@/components/quiz/TimerBar";
import { useCopy } from "@/lib/i18n/useCopy";
import type { BattleRoyaleView } from "@/lib/modes/battleRoyale";
import { useSecondsLeft } from "@/lib/quiz/useSecondsLeft";
import type { RoomView } from "@/lib/room/engine";
import { TopBar } from "@/components/ui/TopBar";
import { displayName } from "./teams";

const LETTERS = ["A", "B", "C", "D"];

interface BattleRoyaleMatchProps {
  room: RoomView;
  match: BattleRoyaleView;
  clockOffset: number;
  onLock: (option: string) => void;
}

export function BattleRoyaleMatch({ room, match, clockOffset, onLock }: BattleRoyaleMatchProps) {
  const t = useCopy();
  const answering = match.phase === "question";
  const localEndsAt = match.endsAt - clockOffset;
  const secondsLeft = useSecondsLeft(localEndsAt);
  const q = match.question;
  if (!q) return null;

  const answered = Object.values(match.optionCounts).reduce((a, b) => a + b, 0) || 1;
  const iWasHit = match.hit.includes(room.you);

  const statusOf = (option: string): AnswerStatus => {
    if (answering) return option === match.myAnswer ? "locked" : "idle";
    if (option === match.answer) return "correct";
    if (option === match.myAnswer) return "wrong";
    return "dimmed";
  };

  return (
    <>
      <TopBar title={t.modes["battle-royale"].name} />

      {/* Status strip: lives and how many are left. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p
          key={match.myLives}
          aria-label={match.amIn ? t.br.lives(match.myLives) : t.br.out}
          className={`anim-pop flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
            match.amIn ? "bg-brand-soft text-brand-deep" : "bg-surface-2 text-muted"
          }`}
        >
          {Array.from({ length: match.maxLives }, (_, i) => (
            <span key={i} aria-hidden="true" className={i < match.myLives ? "" : "opacity-30 grayscale"}>
              ❤️
            </span>
          ))}
        </p>
        <p className="rounded-full bg-surface px-3 py-1 text-sm font-semibold">
          {match.squads ? t.br.squadsIn(match.squadsIn) : t.br.stillIn(match.playersIn, match.playersTotal)}
        </p>
      </div>

      {match.squads && match.mySquad.length > 0 && (
        <ul aria-label={t.br.mySquad} className="mt-2 flex flex-wrap gap-2">
          {match.mySquad.map((m) => (
            <li
              key={m.id}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                m.in ? "border-brand text-brand-deep" : "border-line text-muted line-through"
              }`}
            >
              {m.id === room.you ? t.room.you : displayName(t, room, m.id)}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-sm font-semibold text-muted">
        {t.br.question(match.index + 1)}
      </p>
      <div className="mb-4 mt-2 min-h-7">
        {answering ? (
          <TimerBar key={localEndsAt} endsAt={localEndsAt} totalSeconds={match.answerMs / 1000} secondsLeft={secondsLeft} />
        ) : (
          <p className="text-sm font-semibold text-muted">{t.match.nextIn(secondsLeft)}</p>
        )}
      </div>

      <h1 key={q.id} className="anim-enter text-balance text-2xl font-semibold leading-snug sm:text-3xl">
        {q.text}
      </h1>

      <ul className="mt-5 flex flex-col gap-3">
        {q.options.map((option, i) => {
          const share = answering ? null : Math.round(((match.optionCounts[option] ?? 0) / answered) * 100);
          return (
            <li key={`${q.id}-${option}`} className="anim-enter relative" style={{ "--i": i } as React.CSSProperties}>
              <AnswerOption
                letter={LETTERS[i]}
                text={share === null ? option : `${option} · ${share}%`}
                status={statusOf(option)}
                disabled={!answering || !match.amIn}
                onSelect={() => onLock(option)}
              />
            </li>
          );
        })}
      </ul>

      <div role="status" aria-live="polite" className="mt-4 min-h-16 text-center">
        {!match.amIn && <p className="text-base font-semibold text-muted">{t.br.out}</p>}
        {match.phase === "reveal" && (
          <div className="anim-pop flex flex-col gap-1">
            {match.mercy ? (
              <p className="font-semibold text-brand-deep">{t.br.mercy}</p>
            ) : (
              match.amIn || iWasHit ? (
                <p className={`text-lg font-semibold ${iWasHit ? "text-danger-ink" : "text-brand-deep"}`}>
                  {iWasHit ? t.br.lostLife : t.br.safe}
                </p>
              ) : null
            )}
            {match.wentOut.length > 0 && (
              <p className="text-sm text-muted">
                {t.br.wentOut(match.wentOut.map((id) => (id === room.you ? t.room.you : displayName(t, room, id))).join(", "))}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
