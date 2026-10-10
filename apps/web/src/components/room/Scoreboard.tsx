"use client";

import { useCopy } from "@/lib/i18n/useCopy";
import type { RoomView } from "@naija/game/room/engine";
import { displayName, TeamDot, teamLabel } from "./teams";

interface ScoreboardProps {
  view: RoomView;
  teamScores: Record<string, number>;
  playerScores?: Record<string, number>;
}

/** How many players a free-for-all scoreboard shows (plus you, if you're further down). */
const FFA_SHOWN = 3;

/** Compact team scores that sit at the top of every match screen. */
export function Scoreboard({ view, teamScores, playerScores }: ScoreboardProps) {
  const t = useCopy();
  if (view.teamIds.length === 1 && playerScores) return <PlayerScoreboard view={view} playerScores={playerScores} />;
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

/** Every player for themselves: the leaders, and you. */
function PlayerScoreboard({ view, playerScores }: { view: RoomView; playerScores: Record<string, number> }) {
  const t = useCopy();
  const order = Object.keys(playerScores).sort((a, b) => playerScores[b] - playerScores[a]);
  const shown = order.slice(0, FFA_SHOWN);
  if (order.includes(view.you) && !shown.includes(view.you)) shown.push(view.you);
  return (
    <ul aria-label={t.match.scoreboard} className="flex flex-wrap gap-2">
      {shown.map((id) => (
        <li
          key={id}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${
            id === view.you ? "border-brand bg-brand-soft text-brand-deep" : "border-line bg-surface"
          }`}
        >
          <span className="tabular-nums text-muted">{order.indexOf(id) + 1}.</span>
          <span className="max-w-[8rem] truncate">{id === view.you ? t.room.you : displayName(t, view, id)}</span>
          <span key={playerScores[id]} className="anim-pop tabular-nums text-brand-ink">
            {playerScores[id]}
          </span>
        </li>
      ))}
    </ul>
  );
}
