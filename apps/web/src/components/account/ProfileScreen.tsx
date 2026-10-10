"use client";

import Link from "next/link";
import { BADGES, levelFor, RANKED_MODES } from "@naija/game/progress/progress";
import { rankedQueueFor } from "@naija/game/room/queues";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/account/account";
import { useAccount } from "@/lib/account/useAccount";
import { useCopy } from "@/lib/i18n/useCopy";
import { AuthForm } from "./AuthForm";
import { RankSummary } from "./Rank";

/** /me: level, streak, a record and rank per game, badges; and signing up for guests. */
export function ProfileScreen() {
  const t = useCopy();
  const account = useAccount();

  if (account.status === "off" || account.status === "offline") {
    return (
      <Shell>
        <p className="mt-6 rounded-2xl border border-line bg-surface p-4 text-muted">
          {account.status === "off" ? t.account.unavailable : t.account.errors.offline}
        </p>
      </Shell>
    );
  }
  if (account.status === "loading" || !account.user || !account.progress) {
    return (
      <Shell>
        <p role="status" className="anim-pulse mt-10 text-center font-semibold text-brand-ink">
          {t.account.loading}
        </p>
      </Shell>
    );
  }

  const { user, progress } = account;
  const guest = user.isAnonymous;
  const { level, into, needed } = levelFor(progress.xp);

  return (
    <Shell>
      <section className="anim-enter mt-3 rounded-3xl bg-hero p-5 text-hero-ink">
        <p className="text-sm font-medium opacity-85">{guest ? t.account.guest : user.name}</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="text-4xl font-bold">{t.account.level(level)}</h1>
          {progress.streak > 0 && <span className="rounded-full bg-gold px-3 py-1 text-sm font-semibold text-[#17201b]">🔥 {t.account.streak(progress.streak)}</span>}
        </div>
        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/20"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={needed}
          aria-valuenow={into}
          aria-label={t.account.xp(into, needed)}
        >
          <div className="h-full rounded-full bg-gold" style={{ width: `${(into / needed) * 100}%` }} />
        </div>
        <p className="mt-1.5 text-sm tabular-nums opacity-85">{t.account.xp(into, needed)}</p>
      </section>

      {guest && (
        <section className="anim-enter mt-4 rounded-3xl border border-line bg-surface p-5" style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="text-lg font-semibold">{t.account.saveTitle}</h2>
          <p className="mt-1 mb-4 text-sm text-muted">{t.account.saveBody}</p>
          <AuthForm />
        </section>
      )}

      <section className="mt-6" aria-labelledby="games-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="games-heading" className="text-lg font-semibold">
            {t.account.games}
          </h2>
          <Link href="/leaderboard" className="text-sm font-semibold text-brand-ink underline underline-offset-4">
            {t.leaderboard.open}
          </Link>
        </div>
        <ul className="mt-3 flex flex-col gap-2.5">
          {RANKED_MODES.map((mode, i) => {
            const record = progress.modes[mode];
            return (
              <li key={mode} className="anim-enter rounded-2xl border border-line bg-surface p-4" style={{ "--i": i } as React.CSSProperties}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-sans text-base font-semibold">{t.modes[mode].name}</h3>
                  <p className="text-sm tabular-nums text-muted">
                    <span className="font-semibold text-foreground">{t.account.wins(record?.wins ?? 0)}</span> · {t.account.played(record?.played ?? 0)}
                    {record?.practice ? ` · ${t.account.practice(record.practice)}` : ""}
                  </p>
                </div>
                {rankedQueueFor(mode) && (
                  <div className="mt-3">
                    <RankSummary record={record?.ranked} compact />
                  </div>
                )}
              </li>
            );
          })}
          {progress.modes.solo && (
            <li className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-sans text-base font-semibold">{t.account.soloName}</h3>
                <p className="text-sm tabular-nums text-muted">
                  {t.account.played(progress.modes.solo.practice)} · {t.account.best(progress.modes.solo.best)}
                </p>
              </div>
            </li>
          )}
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="text-lg font-semibold">
          {t.account.badges}
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {BADGES.map(({ id }) => {
            const earned = progress.badges[id] !== undefined;
            return (
              <li
                key={id}
                className={`rounded-2xl border p-3 ${earned ? "border-gold bg-gold-soft" : "border-dashed border-line bg-surface opacity-70"}`}
              >
                <p className={`font-semibold ${earned ? "text-gold-ink" : ""}`}>
                  <span aria-hidden="true">{earned ? "🏅 " : "🔒 "}</span>
                  {t.badges[id].name}
                </p>
                <p className="mt-0.5 text-sm text-muted">{t.badges[id].hint}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {!guest && (
        <Button variant="secondary" onClick={() => void signOut()} className="mt-8 w-full">
          {t.account.signOut}
        </Button>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = useCopy();
  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-4 pb-12 sm:px-6 sm:py-6">
      <TopBar back={{ label: t.common.back, href: "/" }} />
      {children}
    </main>
  );
}
