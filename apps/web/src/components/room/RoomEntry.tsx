"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { useCopy } from "@/lib/i18n/useCopy";
import { isPrivateModeId } from "@naija/game/modes";
import { isRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from "@naija/game/room/code";
import { createRoomCode, quickPlayCode, type QueueId } from "@/lib/room/connect";
import { cleanName } from "@naija/game/room/engine";
import { getNicknameSnapshot, saveNickname, subscribeNickname } from "@/lib/room/identity";
import { NicknameField, inputClasses } from "./NicknameField";
import { TopBar } from "@/components/ui/TopBar";

/** /room: start a room or join one with a code. */
export function RoomEntry() {
  const t = useCopy();
  const router = useRouter();
  // A game tapped on the home screen arrives as /room?mode=…; the room is created with it.
  const modeParam = useSearchParams().get("mode");
  const pickedMode = isPrivateModeId(modeParam) ? modeParam : undefined;
  const saved = useSyncExternalStore(subscribeNickname, getNicknameSnapshot, () => "");
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? saved;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const withName = (go: () => void | Promise<void>) => {
    const clean = cleanName(name);
    if (!clean) return setError(t.room.nicknameRequired);
    saveNickname(clean);
    go();
  };

  const create = () =>
    withName(async () => {
      setCreating(true);
      try {
        router.push(`/room/${await createRoomCode(pickedMode)}`);
      } catch {
        setError(t.errors.server_unreachable);
        setCreating(false);
      }
    });

  const quickPlay = (queue: QueueId) =>
    withName(async () => {
      setCreating(true);
      try {
        router.push(`/room/${await quickPlayCode(queue)}`);
      } catch {
        setError(t.errors.server_unreachable);
        setCreating(false);
      }
    });

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (!isRoomCode(normalized)) return setError(t.room.codeInvalid);
    withName(() => router.push(`/room/${normalized}`));
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-4 sm:px-6 sm:py-6">
      <TopBar back={{ label: t.common.back, href: "/" }} />

      <h1 className="mt-5 text-3xl font-bold">{t.room.title}</h1>

      <div className="anim-enter mt-5">
        <NicknameField
          value={name}
          onChange={(v) => {
            setTypedName(v);
            setError(null);
          }}
        />
      </div>

      <section className="anim-enter mt-6 rounded-3xl border border-line bg-surface p-5" style={{ "--i": 1 } as React.CSSProperties}>
        <h2 className="text-lg font-semibold">{t.quickPlay.title}</h2>
        <p className="mt-1 text-sm text-muted">{t.quickPlay.subtitle}</p>
        <div className="mt-3 flex flex-col gap-2">
          {(
            [
              ["solo", t.quickPlay.solo, t.quickPlay.soloHint],
              ["squads", t.quickPlay.squads, t.quickPlay.squadsHint],
            ] as [QueueId, string, string][]
          ).map(([queue, label, hint]) => (
            <button
              key={queue}
              type="button"
              disabled={creating}
              onClick={() => quickPlay(queue)}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-background p-3 text-left transition hover:border-brand active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted">{hint}</span>
              </span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>
      </section>

      <section className="anim-enter mt-4 rounded-3xl border border-line bg-surface p-5" style={{ "--i": 2 } as React.CSSProperties}>
        <h2 className="text-lg font-semibold">{t.room.createTitle}</h2>
        {pickedMode && <p className="mt-1 text-sm text-muted">{t.modes[pickedMode].name}</p>}
        <Button onClick={create} disabled={creating} className="mt-3 w-full">
          {t.room.create}
        </Button>
      </section>

      <form
        onSubmit={join}
        className="anim-enter mt-4 rounded-3xl border border-line bg-surface p-5"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <h2 className="text-lg font-semibold">{t.room.joinTitle}</h2>
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-sm font-semibold">{t.room.code}</span>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="ABCDE"
            maxLength={ROOM_CODE_LENGTH + 2}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className={`${inputClasses} text-center font-mono text-2xl tracking-[0.3em]`}
          />
        </label>
        <Button type="submit" variant="secondary" className="mt-3 w-full">
          {t.room.join}
        </Button>
      </form>

      <p role="alert" className="mt-4 min-h-6 text-center text-sm font-semibold text-danger-ink">
        {error}
      </p>
    </main>
  );
}
