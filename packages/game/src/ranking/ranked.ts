/**
 * Ranked play, in the style of Valorant's competitive mode. Only Ranked Quick Play matches use
 * it; private rooms and casual Quick Play are unrated.
 *
 * - A hidden MMR (Elo, from `rateMatch`) measures skill.
 * - The visible rank is a tier and division (JJC 1 … Chairman 3, then Odogwu) plus RR, 0–99.
 *   100 RR promotes; dropping below 0 demotes. Odogwu, the top rank, has no divisions and its
 *   RR keeps climbing, like Radiant.
 * - Each match moves RR by how you placed, nudged by the gap between your MMR and your rank:
 *   play above your rank and you gain more and lose less, so you climb to where you belong.
 * - The first `PLACEMENT_MATCHES` matches show no rank; then you are placed from your MMR.
 *
 * Pure and shared: the server settles ranked matches with it; the app only displays the result.
 */

export type RankTierId = "jjc" | "learner" | "sharp" | "oga" | "chairman" | "odogwu";
export const RANK_TIERS: RankTierId[] = ["jjc", "learner", "sharp", "oga", "chairman", "odogwu"];
export const DIVISIONS = 3;
/** JJC 1 is 0, Chairman 3 is 14, Odogwu is 15. */
export const TOP_RANK = (RANK_TIERS.length - 1) * DIVISIONS;

export const PLACEMENT_MATCHES = 5;
export const RR_PER_DIVISION = 100;

/** The MMR that fits each rank: JJC 1 at 800, 50 MMR per division, Odogwu from 1550. */
const MMR_BASE = 800;
const MMR_PER_RANK = 50;
export const mmrForRank = (rank: number) => MMR_BASE + rank * MMR_PER_RANK;
export const rankForMmr = (mmr: number) => Math.max(0, Math.min(TOP_RANK, Math.floor((mmr - MMR_BASE) / MMR_PER_RANK)));

/** RR for a win and a loss in a two-player match, before the MMR nudge. */
const RR_WIN = 22;
const RR_LOSS = -18;
/** Most the MMR gap can add or take away per match. */
const RR_NUDGE_MAX = 8;
const RR_GAIN_MAX = 40;
const RR_LOSS_MAX = -35;

export interface RankedRecord {
  /** Hidden skill rating. */
  mmr: number;
  /** Ranked matches played, including placements. */
  games: number;
  wins: number;
  /** Visible rank (0 = JJC 1); null during placements. */
  rank: number | null;
  rr: number;
  peak: number | null;
}

export const emptyRanked = (mmr = 1000): RankedRecord => ({ mmr, games: 0, wins: 0, rank: null, rr: 0, peak: null });

export interface RankLabel {
  tier: RankTierId;
  /** 1–3, or null for Odogwu. */
  division: number | null;
}

export function rankLabel(rank: number): RankLabel {
  if (rank >= TOP_RANK) return { tier: "odogwu", division: null };
  return { tier: RANK_TIERS[Math.floor(rank / DIVISIONS)], division: (rank % DIVISIONS) + 1 };
}

export const placementsLeft = (r: RankedRecord) => Math.max(0, PLACEMENT_MATCHES - r.games);

/**
 * How well a player did in one match, from 1 (won outright) to 0 (came last). Ties share the
 * average of the places they span, so a two-way tie for first scores 0.5 between two players.
 */
export function performance(rank: number, tiedWith: number, sides: number): number {
  if (sides < 2) return 0.5;
  const from = rank;
  const to = rank + tiedWith - 1;
  const average = (from + to) / 2;
  return 1 - average / (sides - 1);
}

/** The RR change for one match: placement sets it, the MMR-vs-rank gap nudges it. */
export function rrChange(record: RankedRecord, perf: number): number {
  const base = RR_LOSS + (RR_WIN - RR_LOSS) * perf;
  const visible = record.rank === null ? rankForMmr(record.mmr) : record.rank;
  const gap = (record.mmr - mmrForRank(visible)) / MMR_PER_RANK; // in divisions
  const nudge = Math.max(-RR_NUDGE_MAX, Math.min(RR_NUDGE_MAX, gap * 4));
  return Math.round(Math.max(RR_LOSS_MAX, Math.min(RR_GAIN_MAX, base + nudge)));
}

export interface RankedUpdate {
  record: RankedRecord;
  /** RR gained or lost; 0 during placements. */
  rrDelta: number;
  promoted: boolean;
  demoted: boolean;
  /** True on the match that finishes placements and reveals the first rank. */
  placed: boolean;
}

/** Applies one ranked match. `mmr` is the new hidden rating (from `rateMatch`). */
export function applyRanked(before: RankedRecord, mmr: number, perf: number, won: boolean): RankedUpdate {
  const games = before.games + 1;
  const base = { ...before, mmr, games, wins: before.wins + (won ? 1 : 0) };

  if (before.rank === null) {
    if (games < PLACEMENT_MATCHES) return { record: base, rrDelta: 0, promoted: false, demoted: false, placed: false };
    // Placed one division under where the MMR points, so the first rank is earned, not given.
    const rank = Math.max(0, rankForMmr(mmr) - 1);
    return { record: { ...base, rank, rr: 0, peak: rank }, rrDelta: 0, promoted: false, demoted: false, placed: true };
  }

  const delta = rrChange({ ...before, mmr }, perf);
  let rank = before.rank;
  let rr = before.rr + delta;
  let promoted = false;
  let demoted = false;
  while (rank < TOP_RANK && rr >= RR_PER_DIVISION) {
    rank++;
    rr -= RR_PER_DIVISION;
    promoted = true;
  }
  if (rr < 0) {
    if (rank === 0) rr = 0;
    else {
      rank--;
      // Land near the top of the division below, like Valorant's derank.
      rr = Math.max(0, RR_PER_DIVISION + rr);
      demoted = true;
    }
  }
  return {
    record: { ...base, rank, rr, peak: Math.max(before.peak ?? rank, rank) },
    rrDelta: delta,
    promoted,
    demoted,
    placed: false,
  };
}
