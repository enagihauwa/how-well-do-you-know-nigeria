"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useCopy } from "@/lib/i18n/useCopy";
import type { GuessTheYearView, SortAmView } from "@naija/game/modes";
import { isRoomCode, normalizeRoomCode } from "@naija/game/room/code";
import { quickPlayCode } from "@/lib/room/connect";
import { cleanName, type RoomView } from "@naija/game/room/engine";
import { getNicknameSnapshot, getTabNameSnapshot, saveNickname, subscribeNickname } from "@/lib/room/identity";
import { useRoom, type RoomHandle } from "@/lib/room/useRoom";
import dynamic from "next/dynamic";
import { Chat } from "./Chat";
import { Lobby } from "./Lobby";
import { PublicLobby } from "./PublicLobby";
import { NicknameField } from "./NicknameField";

// Each game's screen loads only when a match of it starts, keeping the lobby's first load small.
// The lobby prefetches the chosen game's screen while everyone is still picking teams.
const loaders = {
  trivia: () => import("./TriviaMatch").then((m) => m.TriviaMatch),
  "no-talk-am": () => import("./NoTalkAmMatch").then((m) => m.NoTalkAmMatch),
  "guess-the-year": () => import("./GuessTheYearMatch").then((m) => m.GuessTheYearMatch),
  "sort-am": () => import("./SortAmMatch").then((m) => m.SortAmMatch),
  "battle-royale": () => import("./BattleRoyaleMatch").then((m) => m.BattleRoyaleMatch),
  results: () => import("./MatchResults").then((m) => m.MatchResults),
};
const TriviaMatch = dynamic(loaders.trivia);
const NoTalkAmMatch = dynamic(loaders["no-talk-am"]);
const GuessTheYearMatch = dynamic(loaders["guess-the-year"]);
const SortAmMatch = dynamic(loaders["sort-am"]);
const BattleRoyaleMatch = dynamic(loaders["battle-royale"]);
const MatchResults = dynamic(loaders.results);

/** /room/CODE. Asks for a name (pre-filled from last time) unless this tab already has one, then connects. */
export function RoomScreen() {
  const code = normalizeRoomCode(useParams<{ code: string }>().code ?? "");
  const t = useCopy();
  const nickname = useSyncExternalStore(subscribeNickname, getTabNameSnapshot, () => "");

  if (!isRoomCode(code)) return <Problem message={t.errors.room_not_found} />;
  if (!nickname) return <NameGate />;
  return <ConnectedRoom code={code} name={nickname} />;
}

function ConnectedRoom({ code, name }: { code: string; name: string }) {
  const t = useCopy();
  const router = useRouter();
  const room = useRoom(code, name);
  if (room.fatalError) return <Problem message={t.errors[room.fatalError]} />;
  if (!room.view) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center justify-center px-6">
        <p role="status" className="anim-pulse text-lg font-semibold text-brand-ink">
          {code}…
        </p>
      </main>
    );
  }

  const leave = () => {
    room.send({ type: "leave" });
    router.push("/room");
  };

  // Public matches: leave this finished room and queue for a new one in the same queue.
  const playAgain = async () => {
    const queue = room.view?.settings.configs["battle-royale"].squads ? "squads" : "solo";
    room.send({ type: "leave" });
    try {
      router.push(`/room/${await quickPlayCode(queue)}`);
    } catch {
      router.push("/room");
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-4 sm:px-6 sm:py-6">
      {room.status === "reconnecting" && (
        <p role="alert" className="mb-4 rounded-xl bg-gold px-4 py-2 text-center text-sm font-semibold text-[#17201b]">
          {t.room.disconnected}
        </p>
      )}
      <RoomBody room={room} view={room.view} onLeave={leave} onPlayAgain={playAgain} />
      <Chat view={room.view} messages={room.chat} send={room.send} raised={room.view.status === "lobby" && room.view.kind === "private"} />
      {room.notice && (
        <p role="status" className="anim-enter fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-xl bg-foreground px-4 py-3 text-center text-sm font-semibold text-background shadow-lg">
          {t.errors[room.notice]}
        </p>
      )}
    </main>
  );
}

function RoomBody({
  room,
  view,
  onLeave,
  onPlayAgain,
}: {
  room: RoomHandle;
  view: RoomView;
  onLeave: () => void;
  onPlayAgain: () => void;
}) {
  const { send, clockOffset } = room;
  const mode = view.settings.mode;
  useEffect(() => {
    if (view.status !== "lobby") return;
    void loaders[mode]();
    void loaders.results();
  }, [mode, view.status]);
  if (view.status === "lobby") {
    return view.kind === "public" ? (
      <PublicLobby view={view} clockOffset={clockOffset} onLeave={onLeave} />
    ) : (
      <Lobby view={view} send={send} onLeave={onLeave} />
    );
  }
  if (view.status === "finished") {
    return <MatchResults view={view} onBackToLobby={() => send({ type: "back_to_lobby" })} onPlayAgain={onPlayAgain} />;
  }

  const match = view.match;
  const next = () => send({ type: "mode", action: { type: "next" } });
  switch (match?.mode) {
    case "trivia":
      return (
        <TriviaMatch
          room={view}
          match={match}
          clockOffset={clockOffset}
          onLock={(option) => send({ type: "mode", action: { type: "lock", option } })}
          onNext={next}
        />
      );
    case "no-talk-am":
      return (
        <NoTalkAmMatch
          room={view}
          match={match}
          clockOffset={clockOffset}
          onGuess={(text) => send({ type: "mode", action: { type: "guess", text } })}
          onSkip={() => send({ type: "mode", action: { type: "skip" } })}
          onNext={next}
        />
      );
    case "guess-the-year":
      return (
        <GuessTheYearMatch
          room={view}
          match={match as GuessTheYearView}
          clockOffset={clockOffset}
          onAnswer={(year) => send({ type: "mode", action: { type: "answer", answer: year } })}
          onNext={next}
        />
      );
    case "battle-royale":
      return (
        <BattleRoyaleMatch
          room={view}
          match={match}
          clockOffset={clockOffset}
          onLock={(option) => send({ type: "mode", action: { type: "lock", option } })}
        />
      );
    case "sort-am":
      return (
        <SortAmMatch
          room={view}
          match={match as SortAmView}
          clockOffset={clockOffset}
          onAnswer={(order) => send({ type: "mode", action: { type: "answer", answer: order } })}
          onNext={next}
        />
      );
    default:
      return null;
  }
}

function NameGate() {
  const t = useCopy();
  const saved = useSyncExternalStore(subscribeNickname, getNicknameSnapshot, () => "");
  const [typed, setName] = useState<string | null>(null);
  const name = typed ?? saved;
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanName(name);
    if (!clean) return setError(true);
    saveNickname(clean);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-6">
      <form onSubmit={submit} className="anim-pop rounded-3xl border border-line bg-surface p-6">
        <h1 className="text-2xl font-semibold">{t.room.title}</h1>
        <div className="mt-4">
          <NicknameField
            value={name}
            onChange={(v) => {
              setName(v);
              setError(false);
            }}
          />
        </div>
        <p role="alert" className="mt-2 min-h-5 text-sm font-semibold text-danger-ink">
          {error ? t.room.nicknameRequired : ""}
        </p>
        <Button type="submit" className="mt-2 w-full">
          {t.room.join}
        </Button>
      </form>
    </main>
  );
}

function Problem({ message }: { message: string }) {
  const t = useCopy();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="anim-pop text-5xl" aria-hidden="true">
        😬
      </p>
      <h1 className="mt-4 text-xl font-semibold">{message}</h1>
      <Link href="/room" className={buttonClasses("primary", "mt-6 w-full")}>
        {t.room.title}
      </Link>
    </main>
  );
}
