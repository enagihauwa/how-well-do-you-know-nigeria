"use client";

import type { RoundResult } from "@/lib/modes/roundMode";
import type { RoomView } from "@/lib/room/engine";
import { playerName, TeamDot } from "./teams";

interface RoundResultsProps<Answer> {
  room: RoomView;
  results: RoundResult<Answer>[];
  /** How to show each answer; omitted when the answer is too long to list (e.g. an ordering). */
  format?: (answer: Answer) => string;
}

/** Everyone's answer and points after a reveal, best first. */
export function RoundResults<Answer>({ room, results, format }: RoundResultsProps<Answer>) {
  const sorted = [...results].sort((a, b) => b.points - a.points);
  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((r, i) => (
        <li
          key={r.playerId}
          className={`anim-enter flex items-center justify-between gap-3 rounded-xl border px-4 py-2 text-sm ${
            r.playerId === room.you ? "border-brand bg-brand-soft" : "border-line bg-surface"
          }`}
          style={{ "--i": i } as React.CSSProperties}
        >
          <span className="min-w-0 truncate font-semibold">
            <TeamDot teamId={r.teamId} className="mr-1.5" />
            {playerName(room, r.playerId)}
          </span>
          {format && (
            <span className="min-w-0 truncate text-muted">{r.answer === null ? "—" : format(r.answer)}</span>
          )}
          <span className="shrink-0 font-semibold tabular-nums text-brand-ink">+{r.points}</span>
        </li>
      ))}
    </ul>
  );
}
