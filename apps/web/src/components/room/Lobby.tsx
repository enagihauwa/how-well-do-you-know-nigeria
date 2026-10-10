"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { TopBar } from "@/components/ui/TopBar";
import { categories } from "@naija/game/data/categories";
import { useCopy } from "@/lib/i18n/useCopy";
import { MODE_IDS } from "@naija/game/modes";
import type { AnswerRule } from "@naija/game/modes/trivia";
import { usingLocalRooms } from "@/lib/room/connect";
import { MAX_TEAMS, modeHasBots, type ClientAction, type RoomView } from "@naija/game/room/engine";
import { TeamDot, teamLabel } from "./teams";

interface LobbyProps {
  view: RoomView;
  send: (action: ClientAction) => void;
  onLeave: () => void;
}

/**
 * A private room before the match. The room code and teams stay on the page; choices that are
 * not needed all the time (inviting, picking the game and its options) open in bottom sheets.
 */
export function Lobby({ view, send, onLeave }: LobbyProps) {
  const t = useCopy();
  const [sheet, setSheet] = useState<"invite" | "game" | null>(null);
  const isHost = view.hostId === view.you;
  const me = view.players.find((p) => p.id === view.you);
  const unassigned = view.players.filter((p) => p.teamId === null);
  const { mode, configs, sameRoom } = view.settings;

  const gameDetail = [
    mode === "trivia" && categories.find((c) => c.id === configs.trivia.category)?.label,
    mode === "trivia" && (configs.trivia.answerRule === "team_lock" ? t.room.teamLock : t.room.individual),
    sameRoom && t.room.sameRoom,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <TopBar back={{ label: t.room.leave, onClick: onLeave }} />

      <section
        aria-label={t.room.roomCode}
        className="anim-enter mt-3 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
      >
        <div>
          <p className="text-sm text-muted">{t.room.roomCode}</p>
          <p className="font-display text-3xl font-bold tracking-[0.14em] text-brand-ink">{view.code}</p>
        </div>
        <button
          type="button"
          onClick={() => setSheet("invite")}
          className="min-h-11 rounded-xl bg-brand px-4 font-semibold text-on-brand transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
        >
          {t.room.invite}
        </button>
      </section>
      {usingLocalRooms && <p className="mt-2 text-center text-xs text-muted">{t.room.devNotice}</p>}

      {/* ---------- Teams ---------- */}
      <section className="mt-6" aria-labelledby="teams-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="teams-heading" className="text-lg font-semibold">
            {t.room.teams}
          </h2>
          <p className="text-sm text-muted">{t.room.players(view.players.length, view.maxPlayers)}</p>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-2.5">
          {view.teamIds.map((teamId, i) => {
            const members = view.players.filter((p) => p.teamId === teamId);
            const mine = me?.teamId === teamId;
            return (
              <li
                key={teamId}
                className={`anim-enter flex flex-col rounded-2xl border bg-surface p-3 transition ${mine ? "border-brand" : "border-line"}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2 truncate font-sans text-base font-semibold">
                    <TeamDot teamId={teamId} />
                    {teamLabel(t, teamId)}
                  </h3>
                  {isHost && view.teamIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => send({ type: "remove_team", teamId })}
                      aria-label={`${t.room.removeTeam}: ${teamLabel(t, teamId)}`}
                      className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  )}
                </div>
                <PlayerList view={view} players={members} isHost={isHost} send={send} />
                {!mine && (
                  <button
                    type="button"
                    onClick={() => send({ type: "set_team", teamId })}
                    className="mt-auto min-h-10 rounded-xl bg-brand-soft text-sm font-semibold text-brand-deep transition hover:bg-brand hover:text-on-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
                  >
                    {t.room.joinTeam}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {isHost && view.teamIds.length < MAX_TEAMS && (
          <button
            type="button"
            onClick={() => send({ type: "add_team" })}
            className="mt-2.5 min-h-11 w-full rounded-2xl border border-dashed border-line text-sm font-semibold text-brand-ink transition hover:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
          >
            + {t.room.addTeam}
          </button>
        )}

        {isHost && modeHasBots(mode) && view.players.length < view.maxPlayers && (
          <>
            <button
              type="button"
              onClick={() => send({ type: "add_bot" })}
              className="mt-2.5 min-h-11 w-full rounded-2xl border border-dashed border-line text-sm font-semibold text-brand-ink transition hover:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
            >
              + {t.room.addBot}
            </button>
            {view.players.length === 1 && <p className="mt-1.5 text-center text-sm text-muted">{t.room.addBotHint}</p>}
          </>
        )}

        {unassigned.length > 0 && (
          <div className="mt-3 rounded-2xl border border-dashed border-line p-3">
            <h3 className="font-sans text-sm font-medium text-muted">{t.room.noTeam}</h3>
            <PlayerList view={view} players={unassigned} isHost={isHost} send={send} />
          </div>
        )}
      </section>

      {/* ---------- Game: a summary; the choices open in a sheet ---------- */}
      <section className="mt-6" aria-labelledby="game-heading">
        <h2 id="game-heading" className="text-lg font-semibold">
          {t.room.game}
        </h2>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="min-w-0">
            <p className="font-semibold">{t.modes[mode].name}</p>
            <p className="mt-0.5 text-sm text-muted">{gameDetail || t.modes[mode].description}</p>
          </div>
          {isHost && (
            <button
              type="button"
              onClick={() => setSheet("game")}
              className="min-h-11 shrink-0 rounded-xl border border-line px-4 font-semibold text-brand-ink transition hover:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
            >
              {t.room.change}
            </button>
          )}
        </div>
        {!isHost && <p className="mt-2 text-sm text-muted">{t.room.hostOnly}</p>}
      </section>

      {/* ---------- Start: pinned to the bottom of the screen; the spacer keeps content clear of it ---------- */}
      <div aria-hidden="true" className="h-32" />
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-background/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto max-w-xl sm:px-2">
        {isHost ? (
          <>
            <Button onClick={() => send({ type: "start" })} disabled={view.startProblem !== null} className="w-full">
              {t.room.start}
            </Button>
            {view.startProblem && <p className="mt-2 text-center text-sm text-muted">{t.errors[view.startProblem]}</p>}
          </>
        ) : (
          <p className="anim-pulse py-3 text-center text-base font-semibold text-brand-ink">{t.room.waitingForHost}</p>
        )}
        </div>
      </div>

      <InviteSheet open={sheet === "invite"} onClose={() => setSheet(null)} code={view.code} />
      {isHost && <GameSheet open={sheet === "game"} onClose={() => setSheet(null)} view={view} send={send} />}
    </>
  );
}

function PlayerList({
  view,
  players,
  isHost,
  send,
}: {
  view: RoomView;
  players: RoomView["players"];
  isHost: boolean;
  send: (action: ClientAction) => void;
}) {
  const t = useCopy();
  if (players.length === 0) return <div className="min-h-3" />;
  return (
    <ul className="my-2 flex flex-col gap-1">
      {players.map((p) => (
        <li key={p.id} className={`anim-enter flex items-center gap-1.5 text-[15px] ${p.connected ? "" : "opacity-60"}`}>
          <span className="min-w-0 truncate">{p.name}</span>
          {p.id === view.hostId && (
            <span className="shrink-0 rounded-md bg-gold-soft px-1.5 text-xs font-semibold text-gold-ink">{t.room.host}</span>
          )}
          {p.id === view.you && <span className="shrink-0 text-xs text-muted">({t.room.you})</span>}
          {p.bot && <span className="shrink-0 text-xs text-muted">({t.quickPlay.bot})</span>}
          {!p.connected && <span className="shrink-0 text-xs text-muted">({t.room.offline})</span>}
          {isHost && p.id !== view.you && (
            <button
              type="button"
              onClick={() => send({ type: "kick", playerId: p.id })}
              className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
            >
              {t.room.kick}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function InviteSheet({ open, onClose, code }: { open: boolean; onClose: () => void; code: string }) {
  const t = useCopy();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/room/${code}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(t.room.whatsappMessage(code, url))}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is on screen to read out instead.
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t.room.invite}>
      <div className="flex flex-col gap-3 px-5 pb-5">
        <p className="rounded-2xl bg-surface-2 py-4 text-center font-display text-4xl font-bold tracking-[0.2em] text-brand-ink">
          {code}
        </p>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 font-semibold text-on-brand transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
        >
          {t.room.inviteWhatsApp}
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-4 font-semibold text-brand-ink transition hover:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
        >
          <span aria-live="polite">{copied ? t.room.copied : t.room.copyLink}</span>
        </button>
      </div>
    </BottomSheet>
  );
}

const radioRow = (selected: boolean) =>
  `flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-focus ${
    selected ? "border-brand bg-brand-soft" : "border-line hover:border-brand"
  }`;

function GameSheet({
  open,
  onClose,
  view,
  send,
}: {
  open: boolean;
  onClose: () => void;
  view: RoomView;
  send: (action: ClientAction) => void;
}) {
  const t = useCopy();
  const { mode, configs, sameRoom } = view.settings;

  return (
    <BottomSheet open={open} onClose={onClose} title={t.room.chooseGame}>
      <div className="flex flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t.room.game}</legend>
          {MODE_IDS.map((id) => (
            <label key={id} className={radioRow(mode === id)}>
              <input
                type="radio"
                name="mode"
                checked={mode === id}
                onChange={() => send({ type: "set_mode", mode: id })}
                className="mt-1 h-4.5 w-4.5 accent-brand"
              />
              <span>
                <span className="block font-semibold">{t.modes[id].name}</span>
                <span className="block text-sm text-muted">{t.modes[id].description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === "trivia" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{t.room.category}</span>
              <select
                value={configs.trivia.category}
                onChange={(e) => send({ type: "set_trivia", category: e.target.value as typeof configs.trivia.category })}
                className="min-h-12 rounded-xl border border-line bg-surface px-3 text-base focus:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-focus"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-semibold">{t.room.answerRule}</legend>
              {(
                [
                  ["team_lock", t.room.teamLock, t.room.teamLockHint],
                  ["individual", t.room.individual, t.room.individualHint],
                ] as [AnswerRule, string, string][]
              ).map(([rule, label, hint]) => (
                <label key={rule} className={radioRow(configs.trivia.answerRule === rule)}>
                  <input
                    type="radio"
                    name="answerRule"
                    checked={configs.trivia.answerRule === rule}
                    onChange={() => send({ type: "set_trivia", answerRule: rule })}
                    className="mt-1 h-4.5 w-4.5 accent-brand"
                  />
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-sm text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}

        <label className={radioRow(sameRoom)}>
          <input
            type="checkbox"
            checked={sameRoom}
            onChange={(e) => send({ type: "set_same_room", value: e.target.checked })}
            className="mt-1 h-4.5 w-4.5 accent-brand"
          />
          <span>
            <span className="block font-semibold">{t.room.sameRoom}</span>
            <span className="block text-sm text-muted">{t.room.sameRoomHint}</span>
          </span>
        </label>

        <Button onClick={onClose} className="w-full">
          {t.room.useGame(t.modes[mode].name)}
        </Button>
      </div>
    </BottomSheet>
  );
}
