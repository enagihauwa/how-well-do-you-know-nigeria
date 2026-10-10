"use client";

import { useCopy } from "@/lib/i18n/useCopy";
import type { RoomView } from "@/lib/room/engine";
import { TeamDot, teamLabel } from "./teams";

interface ScoreboardProps {
  view: RoomView;
  teamScores: Record<string, number>;
}

/** Compact team scores that sit at the top of every match screen. */
export function Scoreboard({ view, teamScores }: ScoreboardProps) {
  const t = useCopy();
  const myTeam = view.players.find((p) => p.id === view.you)?.teamId;
  const teams = view.teamIds.filter((id) => id in teamScores);

  return (
    <ul aria-label={t.match.scoreboard} className="flex flex-wrap gap-2">
      {teams.map((id) => (
        <li
          key={id}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${
            id === myTeam ? "border-brand bg-brand-soft text-brand-deep" : "border-line bg-surface"
          }`}
        >
          <TeamDot teamId={id} />
          <span className="max-w-[9rem] truncate">{teamLabel(t, id)}</span>
          {/* key: the number pops whenever it changes */}
          <span key={teamScores[id]} className="anim-pop tabular-nums text-brand-ink">
            {teamScores[id]}
          </span>
        </li>
      ))}
    </ul>
  );
}
