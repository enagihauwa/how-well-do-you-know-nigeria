"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ModeId } from "@naija/game/modes/types";
import { RANKED_MODES } from "@naija/game/progress/progress";
import { rankedQueueFor } from "@naija/game/room/queues";
import { TopBar } from "@/components/ui/TopBar";
import { accountsEnabled, fetchLeaderboard, type LeaderRow } from "@/lib/account/account";
import { useAccount } from "@/lib/account/useAccount";
import { useCopy } from "@/lib/i18n/useCopy";
import { RankEmblem, rankName } from "./Rank";

type By = "wins" | "rank";

/** /leaderboard?mode=…&by=…: a board per game, by wins against people or by ranked rank. */
export function LeaderboardScreen() {
  const t = useCopy();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const me = useAccount().user;

  const mode = (RANKED_MODES as string[]).includes(params.get("mode") ?? "") ? (params.get("mode") as ModeId) : "trivia";
  const hasRanked = rankedQueueFor(mode) !== null;
  const by: By = params.get("by") === "rank" && hasRanked ? "rank" : "wins";
  const [result, setResult] = useState<{ key: string; rows: LeaderRow[] | null } | null>(null);
  const key = `${mode}:${by}`;

  useEffect(() => {
    let live = true;
    void fetchLeaderboard(mode, by).then((rows) => live && setResult({ key, rows }));
    return () => {
      live = false;
    };
  }, [mode, by, key]);

  const go = (next: { mode?: ModeId; by?: By }) => {
    const q = new URLSearchParams({ mode: next.mode ?? mode, by: next.by ?? by });
    router.replace(`${pathname}?${q}`, { scroll: false });
  };
  const rows = result?.key === key ? result.rows : undefined;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-4 pb-12 sm:px-6 sm:py-6">
      <TopBar back={{ label: t.common.back, href: "/" }} />
      <h1 className="mt-5 text-3xl font-bold">{t.leaderboard.title}</h1>

      {/* Games, as tabs that scroll sideways on a phone. */}
      <div role="tablist" aria-label={t.home.games} className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {RANKED_MODES.map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={id === mode}
            onClick={() => go({ mode: id, by: rankedQueueFor(id) ? by : "wins" })}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus ${
              id === mode ? "border-brand bg-brand text-on-brand" : "border-line bg-surface hover:border-brand"
            }`}
          >
            {t.modes[id].name}
          </button>
        ))}
      </div>

      {hasRanked && (
        <div className="mt-3 inline-flex rounded-xl border border-line bg-surface p-1" role="group">
          {(["wins", "rank"] as By[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === by}
              onClick={() => go({ by: option })}
              className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus ${
                option === by ? "bg-brand-soft text-brand-deep" : "text-muted"
              }`}
            >
              {option === "wins" ? t.leaderboard.byWins : t.leaderboard.byRank}
            </button>
          ))}
        </div>
      )}

      {!accountsEnabled || rows === null ? (
        <p className="mt-6 rounded-2xl border border-line bg-surface p-4 text-muted">
          {accountsEnabled ? t.account.errors.offline : t.leaderboard.unavailable}
        </p>
      ) : rows === undefined ? (
        <p role="status" className="anim-pulse mt-8 text-center font-semibold text-brand-ink">
          {t.account.working}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-4 text-center text-muted">{t.leaderboard.empty}</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          {rows.map((row, i) => {
            const mine = row.userId === me?.id;
            return (
              <li
                key={row.userId}
                className={`anim-enter flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-2 ${mine ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
                style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
              >
                <span className="w-7 shrink-0 text-lg font-semibold tabular-nums">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                {by === "rank" && <RankEmblem rank={row.rank} className="h-8 w-8 shrink-0" />}
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {row.name}
                  {mine && <span className="ml-1.5 text-sm font-normal text-muted">({t.leaderboard.you})</span>}
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  {by === "rank" && row.rank !== null ? (
                    <>
                      <span className="block font-semibold">{rankName(t, row.rank)}</span>
                      <span className="block text-sm text-muted">{t.ranked.rr(row.rr)}</span>
                    </>
                  ) : (
                    <>
                      <span className="block font-semibold">{t.account.wins(row.wins)}</span>
                      <span className="block text-sm text-muted">{t.account.played(row.played)}</span>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
