"use client";

import Link from "next/link";
import type { Award } from "@naija/game/progress/progress";
import { useAccount } from "@/lib/account/useAccount";
import { useCopy } from "@/lib/i18n/useCopy";
import { RankEmblem, rankName } from "./Rank";

/**
 * What the last game earned: XP, level-up, streak, new badges and, in ranked, the RR change.
 * `solo`: a solo quiz, which never counts for wins, so it isn't called practice.
 */
export function AwardCard({ award, solo = false }: { award: Award; solo?: boolean }) {
  const t = useCopy();
  const account = useAccount();
  const guest = account.user?.isAnonymous ?? true;
  const ranked = award.ranked;
  const levelUp = award.levelAfter > award.levelBefore;

  return (
    <section aria-live="polite" className="anim-enter w-full rounded-2xl border border-line bg-surface p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <p className="anim-pop font-display text-3xl font-bold text-brand-ink">{t.award.xp(award.xp)}</p>
        {award.streak > 1 && (
          <span className="rounded-full bg-gold-soft px-3 py-1 text-sm font-semibold text-gold-ink">🔥 {t.award.streak(award.streak)}</span>
        )}
      </div>
      {levelUp && <p className="mt-1 font-semibold text-brand-deep">{t.award.levelUp(award.levelAfter)}</p>}
      {award.firstToday && <p className="mt-1 text-sm text-muted">{t.award.firstToday}</p>}
      {!award.counted && !solo && <p className="mt-1 text-sm text-muted">{t.award.practice}</p>}

      {ranked && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
          <RankEmblem rank={ranked.rankAfter} className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {ranked.placed
                ? t.ranked.placed
                : ranked.promoted
                  ? t.ranked.promoted
                  : ranked.demoted
                    ? t.ranked.demoted
                    : ranked.rankAfter === null
                      ? t.ranked.placements(ranked.placementsLeft)
                      : rankName(t, ranked.rankAfter)}
            </p>
            {ranked.rankAfter !== null && (ranked.placed || ranked.promoted || ranked.demoted) && (
              <p className="text-sm text-muted">{rankName(t, ranked.rankAfter)}</p>
            )}
          </div>
          {ranked.rankAfter !== null && !ranked.placed && (
            <span className={`shrink-0 font-semibold tabular-nums ${ranked.rrDelta >= 0 ? "text-brand-ink" : "text-danger-ink"}`}>
              {t.ranked.delta(ranked.rrDelta)}
            </span>
          )}
        </div>
      )}

      {award.newBadges.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-muted">{t.award.newBadge}</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {award.newBadges.map((id) => (
              <li key={id} className="anim-pop rounded-full border border-gold bg-gold-soft px-3 py-1 text-sm font-semibold text-gold-ink">
                🏅 {t.badges[id].name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {guest && (
        <Link href="/me" className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-ink underline underline-offset-4">
          {t.award.keepIt}
        </Link>
      )}
    </section>
  );
}
