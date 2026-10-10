"use client";

import { placementsLeft, rankLabel, RR_PER_DIVISION, TOP_RANK, type RankedRecord, type RankTierId } from "@naija/game/ranking/ranked";
import type { Copy } from "@/lib/i18n/copy";
import { useCopy } from "@/lib/i18n/useCopy";

/** Emblem fills, one per tier. Decorative only: rank names are always written out beside them. */
const TIER_FILL: Record<RankTierId, string> = {
  jjc: "#a08a6e",
  learner: "#6f9e4f",
  sharp: "#3487b0",
  oga: "#d0a21c",
  chairman: "#8b58d1",
  odogwu: "#d4472a",
};

/** "Sharp 2", "Odogwu". */
export function rankName(t: Copy, rank: number): string {
  const { tier, division } = rankLabel(rank);
  return t.ranked.division(t.tiers[tier], division);
}

/** A shield in the tier's colour with one pip per division; a dashed outline while unranked. */
export function RankEmblem({ rank, className = "h-10 w-10" }: { rank: number | null; className?: string }) {
  if (rank === null) {
    return (
      <svg aria-hidden="true" viewBox="0 0 40 40" className={className}>
        <path d="M20 3l14 5v11c0 9-6 15-14 18C12 34 6 28 6 19V8z" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" className="text-muted" />
        <text x="20" y="25" textAnchor="middle" fontSize="13" fontWeight="700" className="fill-muted">?</text>
      </svg>
    );
  }
  const { tier, division } = rankLabel(rank);
  const pips = division ?? 0;
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={className}>
      <path d="M20 3l14 5v11c0 9-6 15-14 18C12 34 6 28 6 19V8z" fill={TIER_FILL[tier]} />
      <path d="M20 7l10 3.6V19c0 6.6-4.3 11-10 13.4C14.3 30 10 25.6 10 19v-8.4z" fill="#fff" opacity="0.18" />
      {rank === TOP_RANK ? (
        <path d="M20 12l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#fff" />
      ) : (
        Array.from({ length: pips }, (_, i) => (
          <path key={i} d={`M13 ${25 - i * 5}l7-4 7 4`} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ))
      )}
    </svg>
  );
}

/** Emblem, rank name and RR bar for one mode; or how many placement matches are left. */
export function RankSummary({ record, compact = false }: { record: RankedRecord | undefined; compact?: boolean }) {
  const t = useCopy();
  const rank = record?.rank ?? null;
  const top = rank === TOP_RANK;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <RankEmblem rank={rank} className={compact ? "h-8 w-8 shrink-0" : "h-11 w-11 shrink-0"} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{rank === null ? t.ranked.unranked : rankName(t, rank)}</p>
        {rank === null ? (
          <p className="text-sm text-muted">{t.ranked.placements(record ? placementsLeft(record) : 5)}</p>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            {!top && (
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={RR_PER_DIVISION}
                aria-valuenow={record!.rr}
                aria-label={t.ranked.rr(record!.rr)}
              >
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, record!.rr)}%` }} />
              </div>
            )}
            <span className="shrink-0 text-sm tabular-nums text-muted">{t.ranked.rr(record!.rr)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
