import { describe, expect, it } from "vitest";
import { sortItems } from "../src/data/sortItems";
import { yearItems } from "../src/data/yearItems";
import { guessTheYearMode } from "../src/modes/guessTheYear";
import { sortAmMode } from "../src/modes/sortAm";
import { ctxWith } from "./helpers";

const players = [
  { id: "ada", name: "Ada", teamId: "t0" },
  { id: "bayo", name: "Bayo", teamId: "t0" },
  { id: "chidi", name: "Chidi", teamId: "t1" },
];
const ctx = ctxWith(players);
const at = (now: number) => ({ ...ctx, now });

describe("Guess the Year", () => {
  const start = () => guessTheYearMode.start(guessTheYearMode.defaultConfig, yearItems, ctx);
  const answer = (s: ReturnType<typeof start>, who: string, year: unknown) =>
    guessTheYearMode.reduce(s, who, { type: "answer", answer: year as number }, ctx);

  it("hides the year until the reveal", () => {
    const s = start();
    const view = guessTheYearMode.view(s, "ada", ctx);
    expect(view.item).toEqual({ prompt: s.items[0].prompt });
    expect(view.solution).toBeNull();
  });

  it("scores exact 20, closest 10, within 3 years 5, and sums per team", () => {
    let s = start();
    const year = s.items[0].year;
    s = answer(s, "ada", year);
    s = answer(s, "bayo", year + 3);
    s = answer(s, "chidi", year - 40);
    expect(s.phase).toBe("reveal");
    // Ada is exact; Bayo is not the closest but within 3; Chidi gets nothing.
    expect(s.playerScores).toEqual({ ada: 20, bayo: 5, chidi: 0 });
    expect(s.teamScores).toEqual({ t0: 25, t1: 0 });
    expect(guessTheYearMode.view(s, "chidi", ctx).solution).toBe(year);
  });

  it("gives the closest guess 10 even when nobody is near", () => {
    let s = start();
    const year = s.items[0].year;
    s = answer(s, "ada", year + 20);
    s = answer(s, "bayo", year - 20);
    s = answer(s, "chidi", year + 50);
    expect(s.playerScores).toEqual({ ada: 10, bayo: 10, chidi: 0 });
  });

  it("rejects non-years, a second answer, and late answers", () => {
    const s = start();
    expect(answer(s, "ada", "1960")).toBe(s);
    expect(answer(s, "ada", 1960.5)).toBe(s);
    expect(answer(s, "ada", 99999)).toBe(s);
    const once = answer(s, "ada", 1960);
    expect(answer(once, "ada", 1961)).toBe(once);
    expect(guessTheYearMode.reduce(s, "ada", { type: "answer", answer: 1960 }, at(s.endsAt))).toBe(s);
  });

  it("plays 8 rounds, then finishes", () => {
    let s = start();
    while (!guessTheYearMode.isFinished(s)) s = guessTheYearMode.tick(s, at(s.endsAt));
    expect(s.index).toBe(7);
  });
});

describe("Sort Am", () => {
  const start = () => sortAmMode.start(sortAmMode.defaultConfig, sortItems, ctx);

  it("never deals the items already in order, and hides the order", () => {
    for (let seed = 0; seed < 20; seed++) {
      const s = sortAmMode.start(sortAmMode.defaultConfig, sortItems, ctx);
      for (const item of s.items) expect(item.shown).not.toEqual(item.order);
    }
    const view = sortAmMode.view(start(), "ada", ctx);
    expect(view.solution).toBeNull();
    expect(view.item?.options).toHaveLength(4);
  });

  it("scores 5 points per item in the right place", () => {
    let s = start();
    const order = s.items[0].order;
    const swapped = [order[1], order[0], order[2], order[3]];
    s = sortAmMode.reduce(s, "ada", { type: "answer", answer: order }, ctx);
    s = sortAmMode.reduce(s, "bayo", { type: "answer", answer: swapped }, ctx);
    s = sortAmMode.reduce(s, "chidi", { type: "answer", answer: [...order].reverse() }, ctx);
    expect(s.playerScores).toEqual({ ada: 20, bayo: 10, chidi: 0 });
    expect(s.teamScores).toEqual({ t0: 30, t1: 0 });
  });

  it("rejects answers that are not a full ordering of the items", () => {
    const s = start();
    const order = s.items[0].order;
    for (const bad of [order.slice(0, 3), [order[0], order[0], order[1], order[2]], ["x", ...order.slice(1)]]) {
      expect(sortAmMode.reduce(s, "ada", { type: "answer", answer: bad }, ctx)).toBe(s);
    }
  });

  it("the host can skip the reveal; it also moves on by itself", () => {
    const revealed = sortAmMode.tick(start(), at(ctx.now + 25_000));
    expect(revealed.phase).toBe("reveal");
    expect(sortAmMode.reduce(revealed, "bayo", { type: "next" }, ctx)).toBe(revealed);
    expect(sortAmMode.reduce(revealed, "ada", { type: "next" }, ctx).index).toBe(1);
    expect(sortAmMode.tick(revealed, at(revealed.endsAt)).index).toBe(1);
  });
});

describe("content", () => {
  it("year items are unique and plausible", () => {
    expect(new Set(yearItems.map((i) => i.id)).size).toBe(yearItems.length);
    for (const i of yearItems) expect(i.year).toBeGreaterThan(1800);
  });

  it("sort items have four unique entries each", () => {
    expect(new Set(sortItems.map((i) => i.id)).size).toBe(sortItems.length);
    for (const i of sortItems) expect(new Set(i.order).size).toBe(4);
  });
});
