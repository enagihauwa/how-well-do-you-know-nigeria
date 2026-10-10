"use client";

import { useEffect, useRef } from "react";
import { Confetti } from "@/components/results/Confetti";
import { Trophy } from "@/components/results/Trophy";
import { AdSlot } from "@/components/ui/AdSlot";
import { useCopy } from "@/lib/i18n/useCopy";
import type { RoomView } from "@/lib/room/engine";
import { HostNext } from "./HostNext";
import { Button } from "@/components/ui/Button";
import { displayName, TeamDot, teamLabel } from "./teams";

interface MatchResultsProps {
  view: RoomView;
  onBackToLobby: () => void;
  /** Public rooms have no lobby to return to: find a new game instead. */
  onPlayAgain: () => void;
}

export function MatchResults({ view, onBackToLobby, onPlayAgain }: MatchResultsProps) {
  const t = useCopy();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const summary = view.summary;
  if (!summary) return null;

  if (summary.placements) return <Placements view={view} placements={summary.placements} onPlayAgain={onPlayAgain} />;

  const teams = Object.entries(summary.teamScores).sort((a, b) => b[1] - a[1]);
  const top = teams[0]?.[1] ?? 0;
  const winners = teams.filter(([, score]) => score === top);
  const players = view.players
    .filter((p) => p.id in summary.playerScores)
    .sort((a, b) => summary.playerScores[b.id] - summary.playerScores[a.id]);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-36 w-full items-center justify-center">
        <Confetti />
        <Trophy className="anim-pop relative h-24 w-auto" />
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-base font-semibold text-muted focus:outline-none"
      >
        {t.match.finalTitle}
      </h1>
      <p className="anim-pop mt-3 text-3xl font-semibold text-brand-deep">
        {teams.length > 1 && winners.length > 1 ? t.match.draw : t.match.winner(teamLabel(t, winners[0]?.[0] ?? "t0"))}
      </p>

      <ol className="mt-6 flex w-full flex-col gap-2">
        {teams.map(([teamId, score], i) => (
          <li
            key={teamId}
            className={`anim-enter flex items-center justify-between rounded-2xl border bg-surface px-4 py-3 ${
              score === top ? "border-gold" : "border-line"
            }`}
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="font-semibold">
              {i + 1}. <TeamDot teamId={teamId} /> {teamLabel(t, teamId)}
            </span>
            <span className="text-2xl font-semibold tabular-nums text-brand-ink">
              {score} <span className="text-sm text-muted">{t.match.points}</span>
            </span>
          </li>
        ))}
      </ol>

      <ul className="mt-4 flex w-full flex-wrap justify-center gap-2">
        {players.map((p) => (
          <li key={p.id} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
            <span className="font-semibold">{p.name}</span>{" "}
            <span className="tabular-nums text-muted">{summary.playerScores[p.id]}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 w-full">
        <HostNext isHost={view.hostId === view.you} label={t.match.backToLobby} onNext={onBackToLobby} />
      </div>

      <AdSlot placement="results" className="mt-8" />
    </div>
  );
}

/** Battle royale results: finishing order, with the player's own place up top. */
function Placements({ view, placements, onPlayAgain }: { view: RoomView; placements: string[]; onPlayAgain: () => void }) {
  const t = useCopy();
  const myPlace = placements.indexOf(view.you) + 1;
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-36 w-full items-center justify-center">
        {myPlace === 1 && <Confetti />}
        <Trophy className="anim-pop relative h-24 w-auto" />
      </div>
      <h1 tabIndex={-1} className="mt-2 text-3xl font-semibold text-brand-deep">
        {t.br.winner(placements[0] === view.you ? t.room.you : displayName(t, view, placements[0]))}
      </h1>
      {myPlace > 0 && <p className="mt-2 text-lg font-semibold">{t.br.yourPlace(myPlace, placements.length)}</p>}

      <ol className="mt-6 flex w-full flex-col gap-2">
        {placements.slice(0, 10).map((id, i) => (
          <li
            key={id}
            className={`anim-enter flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              id === view.you ? "border-brand bg-brand-soft" : "border-line bg-surface"
            }`}
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="w-8 text-lg font-semibold tabular-nums">{medal[i] ?? i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-left font-semibold">{id === view.you ? t.room.you : displayName(t, view, id)}</span>
          </li>
        ))}
      </ol>

      <Button onClick={onPlayAgain} className="mt-8 w-full">
        {t.quickPlay.again}
      </Button>
      <AdSlot placement="results" className="mt-8" />
    </div>
  );
}
