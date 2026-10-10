"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AdSlot } from "@/components/ui/AdSlot";
import { useCopy } from "@/lib/i18n/useCopy";
import type { NoTalkAmView } from "@naija/game/modes/noTalkAm";
import type { RoomView } from "@naija/game/room/engine";
import { HostNext } from "./HostNext";
import { MatchHeader } from "./MatchHeader";
import { playerName, TeamDot, teamLabel } from "./teams";

interface NoTalkAmMatchProps {
  room: RoomView;
  match: NoTalkAmView;
  clockOffset: number;
  onGuess: (text: string) => void;
  onSkip: () => void;
  onNext: () => void;
}

export function NoTalkAmMatch({ room, match, clockOffset, onGuess, onSkip, onNext }: NoTalkAmMatchProps) {
  const t = useCopy();
  const [guess, setGuess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wonCount = useRef(match.myTeamWon.length);
  useEffect(() => {
    wonCount.current = match.myTeamWon.length;
  });
  const isHost = room.hostId === room.you;
  const playing = match.phase === "playing";
  const describer = match.describerId === room.you ? t.room.you : playerName(room, match.describerId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;
    onGuess(guess);
    setGuess("");
    // A right guess adds a word to `myTeamWon`, which pops in below. A wrong one changes nothing
    // on the server, so if no word arrives shortly, shake the field to show it was not it.
    const before = wonCount.current;
    setTimeout(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (wonCount.current > before || reduced) return;
      inputRef.current?.animate(
        [0, -6, 6, -6, 6, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 400, easing: "ease-in-out" },
      );
    }, 400);
  };

  return (
    <>
      <MatchHeader
        view={room}
        clockOffset={clockOffset}
        title={t.modes["no-talk-am"].name}
        progress={t.noTalkAm.roundOf(match.round + 1, match.totalRounds)}
        teamScores={match.teamScores}
        timer={playing ? { endsAt: match.endsAt, totalSeconds: match.roundSeconds } : null}
        autoNextAt={match.phase === "between" ? match.endsAt : undefined}
      />

      {playing && match.role === "describer" && match.card && (
        <section className="mt-5">
          <p className="text-sm font-semibold text-muted">{t.noTalkAm.youDescribe}</p>
          {/* key: each new card pops in */}
          <div key={match.card.word} className="anim-pop mt-2 rounded-3xl border border-brand bg-surface p-6 text-center">
            <p className="text-4xl font-semibold text-brand-deep sm:text-5xl">{match.card.word}</p>
            <p className="mt-5 text-sm font-semibold text-danger-ink">{t.noTalkAm.dontSay}</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {match.card.taboo.map((word) => (
                <li key={word} className="rounded-full bg-surface-2 px-3 py-1 text-base font-semibold line-through decoration-2">
                  {word}
                </li>
              ))}
            </ul>
          </div>
          <Button variant="secondary" onClick={onSkip} className="mt-4 w-full">
            {t.noTalkAm.gotSkip}
          </Button>
        </section>
      )}

      {playing && match.role === "guesser" && (
        <section className="mt-5">
          <p className="anim-enter text-balance text-xl font-semibold leading-snug sm:text-2xl">
            {t.noTalkAm.describing(describer)}
          </p>
          <form onSubmit={submit} className="mt-5 flex gap-2">
            <label htmlFor="guess" className="sr-only">
              {t.noTalkAm.typeGuess}
            </label>
            <input
              id="guess"
              ref={inputRef}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder={t.noTalkAm.typeGuess}
              autoComplete="off"
              autoCapitalize="off"
              enterKeyHint="send"
              autoFocus
              className="min-h-14 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-lg font-semibold placeholder:text-muted focus:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-focus"
            />
            <Button type="submit" className="shrink-0 !px-5">
              {t.noTalkAm.guess}
            </Button>
          </form>
        </section>
      )}

      {playing && match.role === "spectator" && (
        <p className="mt-6 text-center text-base font-semibold text-muted">{t.room.noTeam}</p>
      )}

      {playing && match.myTeamWon.length > 0 && (
        <section aria-live="polite" className="mt-6">
          <p className="text-sm font-semibold text-muted">
            {t.noTalkAm.correct} · {t.noTalkAm.cardsWon(match.myTeamWon.length)}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {match.myTeamWon.map((word, i) => (
              <li key={`${word}-${i}`} className="anim-pop rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-deep">
                ✓ {word}
              </li>
            ))}
          </ul>
        </section>
      )}

      {match.phase === "between" && match.recap && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold">{t.noTalkAm.roundOver}</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {Object.entries(match.recap).map(([teamId, words], i) => (
              <li
                key={teamId}
                className="anim-enter rounded-2xl border border-line bg-surface p-4"
                style={{ "--i": i } as React.CSSProperties}
              >
                <p className="font-semibold">
                  <TeamDot teamId={teamId} className="mr-1.5" />
                  {teamLabel(t, teamId)} · {t.noTalkAm.cardsWon(words.length)}
                </p>
                {words.length > 0 && <p className="mt-1 text-sm text-muted">{words.join(", ")}</p>}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <HostNext isHost={isHost} label={t.noTalkAm.nextRound} onNext={onNext} />
          </div>
          <AdSlot placement="between-rounds" className="mt-6" />
        </section>
      )}
    </>
  );
}
