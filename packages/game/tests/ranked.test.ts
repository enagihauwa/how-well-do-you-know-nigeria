import { describe, expect, it } from "vitest";
import {
  applyRanked,
  emptyRanked,
  mmrForRank,
  performance,
  PLACEMENT_MATCHES,
  rankForMmr,
  rankLabel,
  rrChange,
  TOP_RANK,
  type RankedRecord,
} from "@naija/game/ranking/ranked";

const ranked = (rank: number, rr: number, mmr = mmrForRank(rank)): RankedRecord => ({ mmr, games: 20, wins: 10, rank, rr, peak: rank });

describe("rank labels", () => {
  it("runs JJC 1 to Chairman 3, then Odogwu with no divisions", () => {
    expect(rankLabel(0)).toEqual({ tier: "jjc", division: 1 });
    expect(rankLabel(2)).toEqual({ tier: "jjc", division: 3 });
    expect(rankLabel(3)).toEqual({ tier: "learner", division: 1 });
    expect(rankLabel(14)).toEqual({ tier: "chairman", division: 3 });
    expect(rankLabel(TOP_RANK)).toEqual({ tier: "odogwu", division: null });
  });

  it("maps MMR to ranks and back", () => {
    expect(rankForMmr(0)).toBe(0);
    expect(rankForMmr(mmrForRank(7) + 10)).toBe(7);
    expect(rankForMmr(5000)).toBe(TOP_RANK);
  });
});

describe("performance", () => {
  it("is 1 for first, 0 for last, and splits ties", () => {
    expect(performance(0, 1, 2)).toBe(1);
    expect(performance(1, 1, 2)).toBe(0);
    expect(performance(0, 2, 2)).toBe(0.5);
    expect(performance(2, 1, 5)).toBe(0.5);
  });
});

describe("RR", () => {
  it("gains on a win and loses on a loss when MMR matches the rank", () => {
    expect(rrChange(ranked(6, 50), 1)).toBe(22);
    expect(rrChange(ranked(6, 50), 0)).toBe(-18);
  });

  it("gains more and loses less when MMR is above the rank, and the reverse below it", () => {
    const above = ranked(6, 50, mmrForRank(8));
    const below = ranked(6, 50, mmrForRank(4));
    expect(rrChange(above, 1)).toBeGreaterThan(22);
    expect(rrChange(above, 0)).toBeGreaterThan(-18);
    expect(rrChange(below, 1)).toBeLessThan(22);
    expect(rrChange(below, 0)).toBeLessThan(-18);
  });

  it("caps the swing", () => {
    expect(rrChange(ranked(0, 50, 3000), 1)).toBeLessThanOrEqual(40);
    expect(rrChange(ranked(14, 50, 0), 0)).toBeGreaterThanOrEqual(-35);
  });
});

describe("applying a ranked match", () => {
  it("hides the rank during placements, then places one division under the MMR", () => {
    let r = emptyRanked();
    for (let i = 1; i < PLACEMENT_MATCHES; i++) {
      const u = applyRanked(r, 1000, 1, true);
      expect(u.record.rank).toBeNull();
      expect(u.rrDelta).toBe(0);
      r = u.record;
    }
    const placed = applyRanked(r, mmrForRank(6), 1, true);
    expect(placed).toMatchObject({ placed: true, record: { rank: 5, rr: 0, peak: 5, games: PLACEMENT_MATCHES, wins: PLACEMENT_MATCHES } });
  });

  it("promotes at 100 RR, carrying the rest over", () => {
    const u = applyRanked(ranked(4, 90), mmrForRank(4), 1, true);
    expect(u).toMatchObject({ promoted: true, record: { rank: 5, rr: 12, peak: 5 } });
  });

  it("demotes below 0 RR, landing near the top of the division below", () => {
    const u = applyRanked(ranked(4, 5), mmrForRank(4), 0, false);
    expect(u).toMatchObject({ demoted: true, record: { rank: 3, rr: 87, peak: 4 } });
  });

  it("never drops below JJC 1 at 0 RR", () => {
    expect(applyRanked(ranked(0, 5), mmrForRank(0), 0, false).record).toMatchObject({ rank: 0, rr: 0 });
  });

  it("lets Odogwu RR climb past 100", () => {
    const u = applyRanked(ranked(TOP_RANK, 95), mmrForRank(TOP_RANK), 1, true);
    expect(u.record).toMatchObject({ rank: TOP_RANK, rr: 117 });
    expect(u.promoted).toBe(false);
  });
});
