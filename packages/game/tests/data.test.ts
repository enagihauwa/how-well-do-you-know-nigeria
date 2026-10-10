import { describe, expect, it } from "vitest";
import { categories } from "../src/data/categories";
import { allQuestions } from "../src/data/questions";
import type { CategoryId, Question } from "../src/types";
import { QUESTIONS_PER_GAME } from "../src/quiz/scoring";
import { validateQuestions } from "../src/quiz/validateQuestions";

const categoryIds = categories.map((c) => c.id);

const valid: Question = {
  id: "t-1",
  question: "Q?",
  options: ["a", "b", "c", "d"],
  answer: "a",
  category: "general-knowledge",
  difficulty: "easy",
};

describe("question bank", () => {
  it("passes validation", () => {
    expect(validateQuestions(allQuestions, categoryIds)).toEqual([]);
  });

  it.each(categoryIds)("%s has at least 10 questions", (id: CategoryId) => {
    const count = allQuestions.filter((q) => q.category === id).length;
    expect(count).toBeGreaterThanOrEqual(QUESTIONS_PER_GAME);
  });

  it("has unique ids", () => {
    const ids = allQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("validateQuestions", () => {
  const pad = (n: number): Question[] =>
    Array.from({ length: n }, (_, i) => ({ ...valid, id: `pad-${i}` }));
  const only = ["general-knowledge"] as CategoryId[];

  it("accepts valid data", () => {
    expect(validateQuestions(pad(10), only)).toEqual([]);
  });

  it("flags a category with fewer than 10 questions", () => {
    const errors = validateQuestions(pad(9), only);
    expect(errors.join()).toMatch(/at least 10/);
  });

  it("flags an answer that is not in the options", () => {
    const bad = [...pad(10), { ...valid, id: "bad", answer: "z" }];
    expect(validateQuestions(bad, only).join()).toMatch(/not one of the options/);
  });

  it("flags wrong option count and duplicate options", () => {
    const bad = [
      ...pad(10),
      { ...valid, id: "few", options: ["a", "b", "c"] },
      { ...valid, id: "dup", options: ["a", "a", "b", "c"] },
    ];
    const joined = validateQuestions(bad, only).join();
    expect(joined).toMatch(/exactly 4 options/);
    expect(joined).toMatch(/must be unique/);
  });

  it("flags duplicate ids", () => {
    const bad = [...pad(10), { ...valid, id: "pad-0" }];
    expect(validateQuestions(bad, only).join()).toMatch(/duplicate id/);
  });
});
