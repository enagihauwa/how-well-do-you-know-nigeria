import { describe, expect, it } from "vitest";
import { STARTING_RATING, TIERS, rateMatch, squadOrder, tierFor } from "@/lib/ranking/rating";

const fresh = (games = 20) => ({ rating: STARTING_RATING, games });

describe("rateMatch", () => {
  it("winners gain, losers lose, and the total is conserved among equals", () => {
    const r = rateMatch([["a"], ["b"], ["c"], ["d"]], { a: fresh(), b: fresh(), c: fresh(), d: fresh() });
    expect(r.a.rating).toBeGreaterThan(r.b.rating);
    expect(r.b.rating).toBeGreaterThan(r.c.rating);
    expect(r.c.rating).toBeGreaterThan(r.d.rating);
    const total = Object.values(r).reduce((s, x) => s + x.rating, 0);
    expect(Math.abs(total - 4 * STARTING_RATING)).toBeLessThanOrEqual(2);
  });

  it("beating a stronger player is worth more than beating a weaker one", () => {
    const upset = rateMatch([["low"], ["high"]], { low: { rating: 1000, games: 20 }, high: { rating: 1400, games: 20 } });
    const expectedWin = rateMatch([["high"], ["low"]], { low: { rating: 1000, games: 20 }, high: { rating: 1400, games: 20 } });
    expect(upset.low.rating - 1000).toBeGreaterThan(expectedWin.high.rating - 1400);
  });

  it("new players move faster", () => {
    const r = rateMatch([["newbie"], ["vet"]], { newbie: fresh(0), vet: fresh(50) });
    expect(r.newbie.rating - STARTING_RATING).toBeGreaterThan(STARTING_RATING - r.vet.rating);
    expect(r.newbie.games).toBe(1);
  });

  it("squad members share their squad's change; unknown players start at the default", () => {
    const r = rateMatch([["a", "b"], ["c", "d"]], {});
    expect(r.a.rating).toBe(r.b.rating);
    expect(r.a.rating).toBeGreaterThan(STARTING_RATING);
    expect(r.c.rating).toBeLessThan(STARTING_RATING);
  });

  it("needs at least two sides", () => {
    expect(rateMatch([["a"]], {})).toEqual({});
  });
});

describe("tiers and squads", () => {
  it("maps ratings onto the Naija ladder", () => {
    expect(tierFor(900).id).toBe("jjc");
    expect(tierFor(1250).id).toBe("sharp");
    expect(tierFor(2400).id).toBe("odogwu");
    expect(TIERS.map((t) => t.min)).toEqual([...TIERS.map((t) => t.min)].sort((a, b) => a - b));
  });

  it("groups placements into squads by each squad's best finisher", () => {
    expect(squadOrder(["a", "c", "b", "d"], { a: "s0", b: "s0", c: "s1", d: "s1" })).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});
