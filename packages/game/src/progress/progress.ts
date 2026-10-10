import type { ModeId, PlayerId } from "../modes/types";
import { applyRanked, DIVISIONS, emptyRanked, performance, placementsLeft, RANK_TIERS, type RankedRecord } from "../ranking/ranked";
import { rateMatch, type Rating } from "../ranking/rating";
import type { MatchResult } from "../room/results";

/**
 * A player's progress: XP and levels, a daily streak, badges, and a record per game (played,
 * wins, best score, rank). Pure and shared: the room server applies a finished match with
 * `settleMatch` (or a solo quiz with `settleSolo`) and saves the result; the app only displays it.
 *
 * Wins and win leaderboards only count matches against other people (`MatchResult.counted`).
 * Matches against bots alone are practice: they still earn XP, at half rate. Rank (RR) only
 * moves in Ranked Quick Play matches (`MatchResult.ranked`); see `ranking/ranked.ts`.
 */

/** Every room game, plus the solo quiz. */
export type ProgressModeId = ModeId | "solo";
export const RANKED_MODES: ModeId[] = ["trivia", "no-talk-am", "guess-the-year", "sort-am", "battle-royale"];

export interface ModeRecord {
  /** Counted matches (against people) and wins among them. */
  played: number;
  wins: number;
  /** Matches against bots only. */
  practice: number;
  best: number;
  /** Ranked play in this mode; absent until the first ranked match. */
  ranked?: RankedRecord;
}

export interface ProgressTotals {
  correct: number;
  exact: number;
  perfectSorts: number;
  cardsGuessed: number;
  cardsDescribed: number;
  perfectQuizzes: number;
}

export interface Progress {
  xp: number;
  games: number;
  wins: number;
  streak: number;
  bestStreak: number;
  /** Last day played, "YYYY-MM-DD" in Lagos time. */
  lastDay: string | null;
  /** When each badge was earned (ms). */
  badges: Partial<Record<BadgeId, number>>;
  modes: Partial<Record<ProgressModeId, ModeRecord>>;
  totals: ProgressTotals;
}

export const emptyProgress = (): Progress => ({
  xp: 0,
  games: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  lastDay: null,
  badges: {},
  modes: {},
  totals: { correct: 0, exact: 0, perfectSorts: 0, cardsGuessed: 0, cardsDescribed: 0, perfectQuizzes: 0 },
});

const emptyRecord = (): ModeRecord => ({ played: 0, wins: 0, practice: 0, best: 0 });

// ---------- Levels ----------

/** Total XP needed to reach `level`: 0, 100, 300, 600, 1000… (each level needs 100 more than the last). */
export const xpForLevel = (level: number) => 50 * (level - 1) * level;

export function levelFor(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return { level, into: xp - xpForLevel(level), needed: xpForLevel(level + 1) - xpForLevel(level) };
}

// ---------- Badges ----------

export type BadgeId =
  | "first_game"
  | "first_win"
  | "ten_wins"
  | "fifty_wins"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "all_games"
  | "perfect_quiz"
  | "bullseye"
  | "sorted"
  | "last_one_standing"
  | "wordsmith"
  | "oga"
  | "level_10";

/** In display order. Each is checked against progress after every match. */
export const BADGES: { id: BadgeId; earned: (p: Progress) => boolean }[] = [
  { id: "first_game", earned: (p) => p.games >= 1 },
  { id: "first_win", earned: (p) => p.wins >= 1 },
  { id: "ten_wins", earned: (p) => p.wins >= 10 },
  { id: "fifty_wins", earned: (p) => p.wins >= 50 },
  { id: "streak_3", earned: (p) => p.bestStreak >= 3 },
  { id: "streak_7", earned: (p) => p.bestStreak >= 7 },
  { id: "streak_30", earned: (p) => p.bestStreak >= 30 },
  { id: "all_games", earned: (p) => RANKED_MODES.every((m) => (p.modes[m]?.played ?? 0) + (p.modes[m]?.practice ?? 0) > 0) },
  { id: "perfect_quiz", earned: (p) => p.totals.perfectQuizzes >= 1 },
  { id: "bullseye", earned: (p) => p.totals.exact >= 1 },
  { id: "sorted", earned: (p) => p.totals.perfectSorts >= 1 },
  { id: "last_one_standing", earned: (p) => (p.modes["battle-royale"]?.wins ?? 0) >= 1 },
  { id: "wordsmith", earned: (p) => p.totals.cardsDescribed >= 25 },
  { id: "oga", earned: (p) => RANKED_MODES.some((m) => (p.modes[m]?.ranked?.peak ?? -1) >= RANK_TIERS.indexOf("oga") * DIVISIONS) },
  { id: "level_10", earned: (p) => levelFor(p.xp).level >= 10 },
];

// ---------- Days and streaks ----------

/** The calendar day in Lagos (UTC+1 all year, no daylight saving). */
export const lagosDay = (now: number) => new Date(now + 3_600_000).toISOString().slice(0, 10);

function previousDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

function withStreak(p: Progress, today: string): { progress: Progress; firstToday: boolean } {
  if (p.lastDay === today) return { progress: p, firstToday: false };
  const streak = p.lastDay === previousDay(today) ? p.streak + 1 : 1;
  return { progress: { ...p, streak, bestStreak: Math.max(p.bestStreak, streak), lastDay: today }, firstToday: true };
}

// ---------- XP ----------

export const XP = {
  match: 20,
  win: 30,
  draw: 15,
  perCorrect: 2,
  maxForCorrect: 40,
  perExact: 5,
  perPerfectSort: 5,
  perCard: 3,
  firstGameOfDay: 10,
  soloBase: 10,
  soloPerCorrect: 3,
  soloPerfect: 20,
} as const;

/** What one finished game earned, for the results screen. */
export interface Award {
  xp: number;
  levelBefore: number;
  levelAfter: number;
  streak: number;
  firstToday: boolean;
  newBadges: BadgeId[];
  /** False for practice against bots: no wins. */
  counted: boolean;
  won: boolean;
  /** Ranked matches only: the rank and RR before and after. Ranks are null during placements. */
  ranked: {
    rankBefore: number | null;
    rankAfter: number | null;
    rrBefore: number;
    rrAfter: number;
    rrDelta: number;
    promoted: boolean;
    demoted: boolean;
    placed: boolean;
    placementsLeft: number;
  } | null;
}

function finish(before: Progress, after: Progress, now: number, award: Omit<Award, "levelBefore" | "levelAfter" | "newBadges">) {
  const newBadges = BADGES.filter((b) => !before.badges[b.id] && !after.badges[b.id] && b.earned(after)).map((b) => b.id);
  const badges = { ...after.badges, ...Object.fromEntries(newBadges.map((id) => [id, now])) };
  return {
    progress: { ...after, badges },
    award: { ...award, levelBefore: levelFor(before.xp).level, levelAfter: levelFor(after.xp).level, newBadges },
  };
}

const isBot = (result: MatchResult, id: PlayerId) => result.players.find((p) => p.playerId === id)?.bot ?? false;

export interface Settled {
  progress: Progress;
  award: Award;
}

/**
 * Applies a finished room match to every listed player's progress. `progress` holds the players
 * whose progress is saved (by player id); others are skipped but still rated against.
 */
export function settleMatch(result: MatchResult, progress: Record<PlayerId, Progress>, now: number): Record<PlayerId, Settled> {
  const mode = result.modeId;
  const today = lagosDay(now);

  // Ranked matches move the hidden MMR (Elo between the people in the match) and the visible RR.
  let mmr: Record<PlayerId, Rating> = {};
  const people = result.order
    .map((members, i) => ({ members: members.filter((id) => !isBot(result, id)), rank: result.ranks[i] }))
    .filter((side) => side.members.length > 0);
  if (result.ranked) {
    const current: Record<PlayerId, Rating> = {};
    for (const side of people) {
      for (const id of side.members) {
        const r = progress[id]?.modes[mode]?.ranked;
        if (r) current[id] = { rating: r.mmr, games: r.games };
      }
    }
    mmr = rateMatch(people.map((s) => s.members), current, people.map((s) => s.rank));
  }

  const out: Record<PlayerId, Settled> = {};
  for (const player of result.players) {
    const before = progress[player.playerId];
    if (!before || player.bot) continue;
    const { stats } = player;

    let xp = XP.match + Math.min(XP.maxForCorrect, (stats.correct ?? 0) * XP.perCorrect);
    xp += (stats.exact ?? 0) * XP.perExact + (stats.perfectSorts ?? 0) * XP.perPerfectSort;
    xp += ((stats.cardsGuessed ?? 0) + (stats.cardsDescribed ?? 0)) * XP.perCard;
    if (result.counted && player.won) xp += XP.win;
    if (result.counted && player.draw) xp += XP.draw;
    if (!result.counted) xp = Math.round(xp / 2);

    const streaked = withStreak(before, today);
    if (streaked.firstToday) xp += XP.firstGameOfDay;

    const record = before.modes[mode] ?? emptyRecord();
    let ranked: Award["ranked"] = null;
    let nextRanked = record.ranked;
    const newMmr = mmr[player.playerId];
    if (result.ranked && newMmr) {
      const was = record.ranked ?? emptyRanked();
      const tied = people.filter((side) => side.rank === player.rank).length;
      const update = applyRanked(was, newMmr.rating, performance(player.rank, tied, people.length), player.won);
      nextRanked = update.record;
      ranked = {
        rankBefore: was.rank,
        rankAfter: update.record.rank,
        rrBefore: was.rr,
        rrAfter: update.record.rr,
        rrDelta: update.rrDelta,
        promoted: update.promoted,
        demoted: update.demoted,
        placed: update.placed,
        placementsLeft: placementsLeft(update.record),
      };
    }
    const nextRecord: ModeRecord = {
      ...record,
      played: record.played + (result.counted ? 1 : 0),
      wins: record.wins + (result.counted && player.won ? 1 : 0),
      practice: record.practice + (result.counted ? 0 : 1),
      best: Math.max(record.best, player.score),
      ...(nextRanked && { ranked: nextRanked }),
    };
    const answeredAll = (stats.answered ?? 0) >= 10 && stats.correct === stats.answered;
    const after: Progress = {
      ...streaked.progress,
      xp: before.xp + xp,
      games: before.games + 1,
      wins: before.wins + (result.counted && player.won ? 1 : 0),
      modes: { ...before.modes, [mode]: nextRecord },
      totals: {
        correct: before.totals.correct + (stats.correct ?? 0),
        exact: before.totals.exact + (stats.exact ?? 0),
        perfectSorts: before.totals.perfectSorts + (stats.perfectSorts ?? 0),
        cardsGuessed: before.totals.cardsGuessed + (stats.cardsGuessed ?? 0),
        cardsDescribed: before.totals.cardsDescribed + (stats.cardsDescribed ?? 0),
        perfectQuizzes: before.totals.perfectQuizzes + (mode === "trivia" && answeredAll ? 1 : 0),
      },
    };
    out[player.playerId] = finish(before, after, now, {
      xp,
      streak: after.streak,
      firstToday: streaked.firstToday,
      counted: result.counted,
      won: result.counted && player.won,
      ranked,
    });
  }
  return out;
}

/** The solo quiz's numbers. The phone reports them, so they never count toward wins or ranks. */
export interface SoloResult {
  correct: number;
  total: number;
  score: number;
}

export const SOLO_QUESTIONS = 10;

export function isValidSoloResult(r: unknown): r is SoloResult {
  if (typeof r !== "object" || r === null) return false;
  const { correct, total, score } = r as Record<string, unknown>;
  return (
    total === SOLO_QUESTIONS &&
    Number.isInteger(correct) &&
    (correct as number) >= 0 &&
    (correct as number) <= SOLO_QUESTIONS &&
    score === (correct as number) * 10
  );
}

export function settleSolo(before: Progress, result: SoloResult, now: number): Settled {
  const streaked = withStreak(before, lagosDay(now));
  const perfect = result.correct === result.total;
  let xp = XP.soloBase + result.correct * XP.soloPerCorrect + (perfect ? XP.soloPerfect : 0);
  if (streaked.firstToday) xp += XP.firstGameOfDay;
  const record = before.modes.solo ?? emptyRecord();
  const after: Progress = {
    ...streaked.progress,
    xp: before.xp + xp,
    games: before.games + 1,
    modes: { ...before.modes, solo: { ...record, practice: record.practice + 1, best: Math.max(record.best, result.score) } },
    totals: {
      ...before.totals,
      correct: before.totals.correct + result.correct,
      perfectQuizzes: before.totals.perfectQuizzes + (perfect ? 1 : 0),
    },
  };
  return finish(before, after, now, {
    xp,
    streak: after.streak,
    firstToday: streaked.firstToday,
    counted: false,
    won: false,
    ranked: null,
  });
}

// ---------- Merging ----------

/**
 * Combines two progress records, for when a guest signs up or signs in on a device that has its
 * own guest progress: nothing earned on either is lost.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const modes: Progress["modes"] = { ...a.modes };
  for (const [id, rb] of Object.entries(b.modes) as [ProgressModeId, ModeRecord][]) {
    const ra = modes[id];
    if (!ra) {
      modes[id] = rb;
      continue;
    }
    modes[id] = {
      played: ra.played + rb.played,
      wins: ra.wins + rb.wins,
      practice: ra.practice + rb.practice,
      best: Math.max(ra.best, rb.best),
      // Only signed-up players play ranked, so at most one side has a ranked record; if both
      // somehow do, keep the one with more matches behind it.
      ...((ra.ranked || rb.ranked) && {
        ranked: (ra.ranked?.games ?? -1) >= (rb.ranked?.games ?? -1) ? ra.ranked : rb.ranked,
      }),
    };
  }
  const badges = { ...b.badges };
  for (const [id, at] of Object.entries(a.badges) as [BadgeId, number][]) badges[id] = Math.min(at, badges[id] ?? at);
  const later = (a.lastDay ?? "") >= (b.lastDay ?? "") ? a : b;
  const sameDay = a.lastDay === b.lastDay;
  const sum = (k: keyof ProgressTotals) => a.totals[k] + b.totals[k];
  return {
    xp: a.xp + b.xp,
    games: a.games + b.games,
    wins: a.wins + b.wins,
    streak: sameDay ? Math.max(a.streak, b.streak) : later.streak,
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    lastDay: later.lastDay,
    badges,
    modes,
    totals: {
      correct: sum("correct"),
      exact: sum("exact"),
      perfectSorts: sum("perfectSorts"),
      cardsGuessed: sum("cardsGuessed"),
      cardsDescribed: sum("cardsDescribed"),
      perfectQuizzes: sum("perfectQuizzes"),
    },
  };
}

/** Fills fields added after a record was saved, so old rows load safely. */
export function normalizeProgress(saved: Partial<Progress> | null | undefined): Progress {
  const base = emptyProgress();
  return { ...base, ...saved, totals: { ...base.totals, ...saved?.totals }, badges: { ...saved?.badges }, modes: { ...saved?.modes } };
}
