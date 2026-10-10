"use client";

import { AnswerOption, type AnswerStatus } from "@/components/quiz/AnswerOption";
import { categories } from "@/data/categories";
import { useCopy } from "@/lib/i18n/useCopy";
import { SECONDS_PER_QUESTION } from "@/lib/quiz/scoring";
import type { TriviaView } from "@/lib/modes/trivia";
import type { RoomView } from "@/lib/room/engine";
import { HostNext } from "./HostNext";
import { MatchHeader } from "./MatchHeader";
import { playerName, TeamDot, teamLabel } from "./teams";

const LETTERS = ["A", "B", "C", "D"];

interface TriviaMatchProps {
  room: RoomView;
  match: TriviaView;
  clockOffset: number;
  onLock: (option: string) => void;
  onNext: () => void;
}

export function TriviaMatch({ room, match, clockOffset, onLock, onNext }: TriviaMatchProps) {
  const t = useCopy();
  const q = match.question;
  if (!q) return null;
  const answering = match.phase === "question";
  const isHost = room.hostId === room.you;

  const statusOf = (option: string): AnswerStatus => {
    if (answering) return option === match.myLock ? "locked" : "idle";
    if (option === match.answer) return "correct";
    if (option === match.myLock) return "wrong";
    return "dimmed";
  };

  const lockedBy =
    match.answerRule === "team_lock" && match.myLockBy
      ? match.myLockBy === room.you
        ? t.room.you
        : playerName(room, match.myLockBy)
      : null;

  return (
    <>
      <MatchHeader
        view={room}
        clockOffset={clockOffset}
        title={`${t.modes.trivia.name} · ${categories.find((c) => c.id === match.category)?.label ?? ""}`}
        progress={t.quiz.questionOf(match.index + 1, match.total)}
        teamScores={match.teamScores}
        timer={answering ? { endsAt: match.endsAt, totalSeconds: SECONDS_PER_QUESTION } : null}
        autoNextAt={answering ? undefined : match.endsAt}
      />

      {/* key: the question animates in each time it changes */}
      <h1 key={q.id} className="anim-enter mt-5 text-balance text-2xl font-semibold leading-snug sm:text-3xl">
        {q.text}
      </h1>

      <ul className="mt-5 flex flex-col gap-3">
        {q.options.map((option, i) => (
          <li key={`${q.id}-${option}`} className="anim-enter" style={{ "--i": i } as React.CSSProperties}>
            <AnswerOption
              letter={LETTERS[i]}
              text={option}
              status={statusOf(option)}
              disabled={!answering}
              onSelect={() => onLock(option)}
            />
          </li>
        ))}
      </ul>

      <div role="status" aria-live="polite" className="mt-4 min-h-12 text-center text-sm font-semibold text-muted">
        {answering &&
          (lockedBy
            ? t.match.teamLocked(lockedBy)
            : match.myLock
              ? `${t.match.youLocked} · ${t.match.answered(match.lockedCount, match.expectedCount)}`
              : t.match.answered(match.lockedCount, match.expectedCount))}
      </div>

      {!answering && (
        <section aria-label={t.feedback.correctAnswerIs} className="mt-2">
          <ul className="flex flex-col gap-2">
            {match.reveals.map((r, i) => (
              <li
                key={`${r.teamId}-${r.playerId ?? i}`}
                className="anim-enter flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2 text-sm"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="min-w-0 truncate font-semibold">
                  <TeamDot teamId={r.teamId} className="mr-1.5" />
                  {match.answerRule === "team_lock" ? teamLabel(t, r.teamId) : playerName(room, r.playerId)}
                </span>
                <span className="min-w-0 truncate text-muted">{r.option ?? "—"}</span>
                <span aria-label={r.correct ? "correct" : "wrong"} className="font-semibold">
                  {r.correct ? "✓" : "✗"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <HostNext isHost={isHost} onNext={onNext} />
          </div>
        </section>
      )}
    </>
  );
}
