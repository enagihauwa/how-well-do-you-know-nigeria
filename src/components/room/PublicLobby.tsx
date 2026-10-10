"use client";

import { useCopy } from "@/lib/i18n/useCopy";
import { useSecondsLeft } from "@/lib/quiz/useSecondsLeft";
import type { RoomView } from "@/lib/room/engine";
import { TopBar } from "@/components/ui/TopBar";

interface PublicLobbyProps {
  view: RoomView;
  clockOffset: number;
  onLeave: () => void;
}

/** A Quick Play room filling up: who is in, and the countdown once there are enough. */
export function PublicLobby({ view, clockOffset, onLeave }: PublicLobbyProps) {
  const t = useCopy();
  const localStartsAt = view.startsAt === null ? 0 : view.startsAt - clockOffset;
  const secondsLeft = useSecondsLeft(localStartsAt);
  const localBotsAt = view.botsAt === null ? 0 : view.botsAt - clockOffset;
  const botsIn = useSecondsLeft(localBotsAt);
  const present = view.players.filter((p) => p.connected);
  const squads = view.settings.configs["battle-royale"].squads;

  return (
    <>
      <TopBar back={{ label: t.room.leave, onClick: onLeave }} />

      <header className="mt-6 text-center">
        <p className="text-sm font-semibold text-brand-ink">{squads ? t.quickPlay.squads : t.quickPlay.solo}</p>
        <h1 className="mt-2 text-3xl font-semibold">{view.startsAt === null ? t.quickPlay.searching : t.quickPlay.startsIn(secondsLeft)}</h1>
        <p role="status" className="mt-2 text-base text-muted">
          {view.startsAt !== null
            ? t.room.players(present.length, view.maxPlayers)
            : view.botsAt !== null
              ? t.quickPlay.botsIn(botsIn)
              : t.quickPlay.waitingFor(Math.max(0, view.minPlayers - present.length))}
        </p>
      </header>

      {/* A ring that fills as players arrive. It only animates when someone joins. */}
      <div className="relative mx-auto mt-8 h-40 w-40" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-line" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${Math.min(100, (present.length / view.maxPlayers) * 100)} 100`}
            className="stroke-brand transition-[stroke-dasharray] duration-500"
          />
        </svg>
        <p className="absolute inset-0 flex items-center justify-center text-4xl font-semibold tabular-nums text-brand-ink">
          {present.length}
        </p>
      </div>

      <ul className="mt-8 flex flex-wrap justify-center gap-2">
        {present.map((p) => (
          <li
            key={p.id}
            className={`anim-pop rounded-full border px-3 py-1 text-sm font-semibold ${
              p.id === view.you ? "border-brand bg-brand-soft text-brand-deep" : "border-line bg-surface"
            }`}
          >
            {p.id === view.you ? `${p.name} (${t.room.you})` : p.bot ? `${p.name} (${t.quickPlay.bot})` : p.name}
          </li>
        ))}
      </ul>
    </>
  );
}
