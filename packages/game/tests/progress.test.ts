import { describe, expect, it } from "vitest";
import type { MatchSummary, ModeId } from "@naija/game/modes/types";
import {
  emptyProgress,
  isValidSoloResult,
  lagosDay,
  levelFor,
  mergeProgress,
  normalizeProgress,
  settleMatch,
  settleSolo,
  XP,
  type Progress,
} from "@naija/game/progress/progress";
import { PLACEMENT_MATCHES } from "@naija/game/ranking/ranked";
import { rateMatch, STARTING_RATING } from "@naija/game/ranking/rating";
import { createRoom, type RoomState } from "@naija/game/room/engine";
import { matchResult, type MatchResult } from "@naija/game/room/results";

const NOON = Date.parse("2026-10-10T11:00:00Z"); // 12:00 in Lagos

/** A finished room: `teams` maps team id → player ids. */
function finished(modeId: ModeId, teams: Record<string, string[]>, summary: Partial<MatchSummary>): RoomState {
  const base = createRoom("ABCDE");
  const players = Object.entries(teams).flatMap(([teamId, ids]) =>
    ids.map((id) => ({ id, name: id, teamId, connected: true, disconnectedAt: null, bot: id.startsWith("bot-") })),
  );
  const playerScores = summary.playerScores ?? Object.fromEntries(players.map((p) => [p.id, 0]));
  return {
    ...base,
    players,
    teamIds: Object.keys(teams),
    status: "finished",
    match: { modeId, state: null },
    summary: { teamScores: {}, playerScores, ...summary },
  } as RoomState;
}

describe("match results", () => {
  it("ranks teams by score, with one winner", () => {
    const r = matchResult(
      finished("trivia", { t0: ["ada", "bayo"], t1: ["chi"] }, { teamScores: { t0: 50, t1: 30 }, playerScores: { ada: 30, bayo: 20, chi: 30 } }),
    )!;
    expect(r.order).toEqual([["ada", "bayo"], ["chi"]]);
    expect(r.players.find((p) => p.playerId === "ada")).toMatchObject({ rank: 0, won: true, draw: false, score: 30 });
    expect(r.players.find((p) => p.playerId === "chi")).toMatchObject({ rank: 1, won: false });
    expect(r.counted).toBe(true);
  });

  it("calls level scores a draw, not a win", () => {
    const r = matchResult(finished("sort-am", { t0: ["ada"], t1: ["bayo"] }, { teamScores: { t0: 40, t1: 40 } }))!;
    expect(r.ranks).toEqual([0, 0]);
    expect(r.players.every((p) => p.draw && !p.won)).toBe(true);
  });

  it("uses battle royale placements, and treats a match against bots alone as practice", () => {
    const r = matchResult(
      finished("battle-royale", { t0: ["bot-0", "ada", "bot-1"] }, { placements: ["bot-0", "ada", "bot-1"] }),
    )!;
    expect(r.order).toEqual([["bot-0"], ["ada"], ["bot-1"]]);
    expect(r.players.find((p) => p.playerId === "ada")?.rank).toBe(1);
    expect(r.counted).toBe(false);
  });

  it("is null until the match has finished", () => {
    expect(matchResult(createRoom("ABCDE"))).toBeNull();
  });
});

describe("settling a match", () => {
  const result = (counted: boolean, overrides: Partial<MatchResult> = {}): MatchResult => ({
    modeId: "trivia",
    order: [["ada"], [counted ? "bayo" : "bot-0"]],
    ranks: [0, 1],
    counted,
    ranked: false,
    players: [
      { playerId: "ada", bot: false, rank: 0, won: true, draw: false, score: 70, stats: { answered: 10, correct: 7 } },
      counted
        ? { playerId: "bayo", bot: false, rank: 1, won: false, draw: false, score: 40, stats: { answered: 10, correct: 4 } }
        : { playerId: "bot-0", bot: true, rank: 1, won: false, draw: false, score: 40, stats: {} },
    ],
    ...overrides,
  });

  it("awards XP, a win and first badges in an unrated match against people, without touching rank", () => {
    const out = settleMatch(result(true), { ada: emptyProgress(), bayo: emptyProgress() }, NOON);
    const ada = out.ada;
    expect(ada.award.xp).toBe(XP.match + 7 * XP.perCorrect + XP.win + XP.firstGameOfDay);
    expect(ada.progress).toMatchObject({ games: 1, wins: 1, streak: 1, lastDay: "2026-10-10" });
    expect(ada.progress.modes.trivia).toEqual({ played: 1, wins: 1, practice: 0, best: 70 });
    expect(ada.award.newBadges).toEqual(["first_game", "first_win"]);
    expect(ada.award.ranked).toBeNull();
    expect(out.bayo.award.won).toBe(false);
  });

  it("in ranked, plays placements first, then shows a rank and moves RR both ways", () => {
    let ada = emptyProgress();
    let bayo = emptyProgress();
    for (let i = 0; i < PLACEMENT_MATCHES; i++) {
      const out = settleMatch(result(true, { ranked: true }), { ada, bayo }, NOON + i * 60_000);
      ada = out.ada.progress;
      bayo = out.bayo.progress;
      if (i < PLACEMENT_MATCHES - 1) expect(out.ada.award.ranked).toMatchObject({ rankAfter: null, rrDelta: 0, placementsLeft: PLACEMENT_MATCHES - 1 - i });
      else expect(out.ada.award.ranked).toMatchObject({ placed: true, placementsLeft: 0 });
    }
    // Ada won every placement, so her hidden MMR and her first rank sit above Bayo's.
    expect(ada.modes.trivia!.ranked!.mmr).toBeGreaterThan(bayo.modes.trivia!.ranked!.mmr);
    expect(ada.modes.trivia!.ranked!.rank!).toBeGreaterThan(bayo.modes.trivia!.ranked!.rank!);

    const next = settleMatch(result(true, { ranked: true }), { ada, bayo }, NOON + 3_600_000);
    expect(next.ada.award.ranked!.rrDelta).toBeGreaterThan(0);
    expect(next.bayo.award.ranked!.rrDelta).toBeLessThan(0);
    expect(next.ada.progress.modes.trivia!.ranked!.wins).toBe(PLACEMENT_MATCHES + 1);
  });

  it("counts a match against bots as practice: half XP, no win, no rank", () => {
    const out = settleMatch(result(false), { ada: emptyProgress() }, NOON);
    expect(out["bot-0"]).toBeUndefined();
    const ada = out.ada;
    expect(ada.award.xp).toBe(Math.round((XP.match + 7 * XP.perCorrect) / 2) + XP.firstGameOfDay);
    expect(ada.progress.wins).toBe(0);
    expect(ada.progress.modes.trivia).toEqual({ played: 0, wins: 0, practice: 1, best: 70 });
    expect(ada.award).toMatchObject({ counted: false, won: false, ranked: null });
  });

  it("only settles players whose progress is saved, but still rates them against everyone", () => {
    const out = settleMatch(result(true, { ranked: true }), { bayo: emptyProgress() }, NOON);
    expect(Object.keys(out)).toEqual(["bayo"]);
    expect(out.bayo.progress.modes.trivia!.ranked!.mmr).toBeLessThan(1000);
  });

  it("gives each badge once", () => {
    const first = settleMatch(result(true), { ada: emptyProgress() }, NOON).ada.progress;
    const second = settleMatch(result(true), { ada: first }, NOON + 60_000).ada;
    expect(second.award.newBadges).toEqual([]);
    expect(second.award.firstToday).toBe(false);
  });
});

describe("streaks and levels", () => {
  it("uses the Lagos day", () => {
    expect(lagosDay(Date.parse("2026-10-10T22:59:00Z"))).toBe("2026-10-10");
    expect(lagosDay(Date.parse("2026-10-10T23:00:00Z"))).toBe("2026-10-11");
  });

  it("grows on consecutive days and resets after a missed one", () => {
    const solo = { correct: 5, total: 10, score: 50 };
    let p = settleSolo(emptyProgress(), solo, NOON).progress;
    p = settleSolo(p, solo, NOON + 86_400_000).progress;
    const day3 = settleSolo(p, solo, NOON + 2 * 86_400_000);
    expect(day3.progress.streak).toBe(3);
    expect(day3.award.newBadges).toContain("streak_3");
    const gap = settleSolo(day3.progress, solo, NOON + 4 * 86_400_000).progress;
    expect(gap).toMatchObject({ streak: 1, bestStreak: 3 });
  });

  it("levels up every 100 more XP than the last", () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, needed: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toEqual({ level: 2, into: 0, needed: 200 });
    expect(levelFor(650)).toEqual({ level: 4, into: 50, needed: 400 });
  });
});

describe("solo quiz", () => {
  it("accepts only a well-formed 10-question result", () => {
    expect(isValidSoloResult({ correct: 7, total: 10, score: 70 })).toBe(true);
    expect(isValidSoloResult({ correct: 7, total: 10, score: 100 })).toBe(false);
    expect(isValidSoloResult({ correct: 11, total: 10, score: 110 })).toBe(false);
    expect(isValidSoloResult({ correct: 1.5, total: 10, score: 15 })).toBe(false);
    expect(isValidSoloResult(null)).toBe(false);
  });

  it("earns XP and the perfect-quiz badge, but never wins", () => {
    const { progress, award } = settleSolo(emptyProgress(), { correct: 10, total: 10, score: 100 }, NOON);
    expect(award.xp).toBe(XP.soloBase + 10 * XP.soloPerCorrect + XP.soloPerfect + XP.firstGameOfDay);
    expect(award.newBadges).toContain("perfect_quiz");
    expect(progress.wins).toBe(0);
    expect(progress.modes.solo).toMatchObject({ practice: 1, best: 100 });
  });
});

describe("merging guest progress into an account", () => {
  it("keeps everything from both", () => {
    const solo = { correct: 10, total: 10, score: 100 };
    const guest = settleSolo(emptyProgress(), solo, NOON).progress;
    const account: Progress = settleMatch(
      {
        modeId: "trivia",
        order: [["x"], ["y"]],
        ranks: [0, 1],
        counted: true,
        ranked: false,
        players: [{ playerId: "x", bot: false, rank: 0, won: true, draw: false, score: 10, stats: {} }],
      },
      { x: emptyProgress() },
      NOON - 86_400_000,
    ).x.progress;
    const merged = mergeProgress(account, guest);
    expect(merged.xp).toBe(account.xp + guest.xp);
    expect(merged.wins).toBe(1);
    expect(merged.games).toBe(2);
    expect(merged.modes.trivia?.wins).toBe(1);
    expect(merged.modes.solo?.best).toBe(100);
    expect(Object.keys(merged.badges).sort()).toEqual(["first_game", "first_win", "perfect_quiz"]);
    expect(merged.lastDay).toBe("2026-10-10");
  });

  it("loads old or partial saved records safely", () => {
    expect(normalizeProgress({ xp: 5 } as Partial<Progress>)).toMatchObject({ xp: 5, totals: { correct: 0 }, badges: {}, modes: {} });
    expect(normalizeProgress(null)).toEqual(emptyProgress());
  });
});

describe("ratings with ties", () => {
  it("moves nobody when equal players draw", () => {
    const out = rateMatch([["a"], ["b"]], {}, [0, 0]);
    expect(out.a.rating).toBe(STARTING_RATING);
    expect(out.b.rating).toBe(STARTING_RATING);
  });
});
