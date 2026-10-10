import { describe, expect, it } from "vitest";
import { allQuestions } from "../src/data/questions";
import { selectQuestions, shuffle } from "../src/quiz/selectQuestions";
import { QUESTIONS_PER_GAME } from "../src/quiz/scoring";

/** Small deterministic RNG (mulberry32) so tests are repeatable. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("shuffle", () => {
  it("keeps the same items and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seeded(1));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(input);
  });
});

describe("selectQuestions", () => {
  it("returns 10 questions from the chosen category only", () => {
    const qs = selectQuestions(allQuestions, "food-and-culture", seeded(2));
    expect(qs).toHaveLength(QUESTIONS_PER_GAME);
    expect(qs.every((q) => q.category === "food-and-culture")).toBe(true);
  });

  it("never repeats a question within a game", () => {
    for (let seed = 0; seed < 50; seed++) {
      const qs = selectQuestions(allQuestions, "states-and-geography", seeded(seed));
      expect(new Set(qs.map((q) => q.id)).size).toBe(QUESTIONS_PER_GAME);
    }
  });

  it("keeps each question's options and answer intact after shuffling", () => {
    const qs = selectQuestions(allQuestions, "general-knowledge", seeded(3));
    for (const q of qs) {
      const original = allQuestions.find((o) => o.id === q.id)!;
      expect([...q.options].sort()).toEqual([...original.options].sort());
      expect(q.options).toContain(q.answer);
      expect(q.answer).toBe(original.answer);
    }
  });

  it("does not mutate the source data", () => {
    const before = JSON.stringify(allQuestions);
    selectQuestions(allQuestions, "music-and-entertainment", seeded(4));
    expect(JSON.stringify(allQuestions)).toBe(before);
  });

  it("varies the selection and the answer positions across games", () => {
    const sets = new Set<string>();
    const positions = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      const qs = selectQuestions(allQuestions, "general-knowledge", seeded(seed));
      sets.add(qs.map((q) => q.id).join());
      qs.forEach((q) => positions.add(q.options.indexOf(q.answer)));
    }
    expect(sets.size).toBeGreaterThan(1);
    expect(positions.size).toBe(4);
  });

  it("throws a data error when a category has fewer than 10 questions", () => {
    const small = allQuestions
      .filter((q) => q.category === "general-knowledge")
      .slice(0, 9);
    expect(() => selectQuestions(small, "general-knowledge")).toThrow(/at least 10/);
  });
});
