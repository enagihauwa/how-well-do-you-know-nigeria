"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MODE_IDS } from "@naija/game/modes";
import { useCopy } from "@/lib/i18n/useCopy";
import { isRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from "@naija/game/room/code";
import { Button, buttonClasses } from "@/components/ui/Button";
import { NigerianFlag } from "@/components/ui/NigerianFlag";
import { TopBar } from "@/components/ui/TopBar";

interface HomeScreenProps {
  onPlay: () => void;
}

export function HomeScreen({ onPlay }: HomeScreenProps) {
  const t = useCopy();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (!isRoomCode(normalized)) return setCodeError(true);
    router.push(`/room/${normalized}`);
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-4 sm:px-6 sm:py-6">
      <TopBar title={<NigerianFlag />} />

      {/* The one bold moment: a green card with the danfo's double stripe. */}
      <section className="anim-enter mt-3 overflow-hidden rounded-3xl bg-hero text-hero-ink">
        <div className="px-5 pb-5 pt-7 sm:px-7 sm:pt-9">
          <p className="text-sm font-medium opacity-85">{t.home.eyebrow}</p>
          <h1 className="mt-2 text-[clamp(2rem,9vw,3rem)] font-bold leading-[1.05]">How well do you know Nigeria?</h1>
        </div>
        <div aria-hidden="true" className="flex flex-col gap-1 px-5 pb-5 sm:px-7">
          <span className="h-[3px] w-[72px] rounded-full bg-gold" />
          <span className="h-[3px] w-[72px] rounded-full bg-gold" />
        </div>
      </section>

      <div className="anim-enter mt-5 flex flex-col gap-3" style={{ "--i": 1 } as React.CSSProperties}>
        <Link href="/room" className={buttonClasses("primary", "w-full")}>
          {t.home.playFriends}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        <Button variant="secondary" onClick={onPlay} className="w-full">
          {t.home.playSolo}
        </Button>
      </div>

      <form
        onSubmit={join}
        className="anim-enter mt-5 rounded-2xl border border-line bg-surface p-4"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        <label htmlFor="home-code" className="text-sm font-semibold">
          {t.home.codeLabel}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="home-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setCodeError(false);
            }}
            placeholder="7PDPQ"
            maxLength={ROOM_CODE_LENGTH + 2}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={codeError}
            aria-describedby={codeError ? "home-code-error" : undefined}
            className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-background px-3 font-display text-xl font-semibold tracking-[0.18em] placeholder:text-muted focus:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-focus"
          />
          <button
            type="submit"
            className="h-12 rounded-xl bg-brand-soft px-5 font-semibold text-brand-deep transition hover:bg-brand hover:text-on-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
          >
            {t.home.join}
          </button>
        </div>
        {codeError && (
          <p id="home-code-error" role="alert" className="mt-2 text-sm font-medium text-danger-ink">
            {t.room.codeInvalid}
          </p>
        )}
      </form>

      <section className="anim-enter mt-6" style={{ "--i": 3 } as React.CSSProperties}>
        <h2 className="text-sm font-semibold text-muted">{t.home.games}</h2>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {[...MODE_IDS, "battle-royale" as const].map((id) => (
            <li key={id}>
              {/* Who Go Remain? is the public quick-play mode, so it lands on /room's quick play. */}
              <Link
                href={id === "battle-royale" ? "/room" : `/room?mode=${id}`}
                className="block rounded-xl border border-transparent bg-surface px-3 py-3 text-[15px] font-medium transition hover:border-brand active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
              >
                {t.modes[id].name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
