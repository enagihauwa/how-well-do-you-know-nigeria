import { describe, expect, it } from "vitest";
import {
  MAX_SCORE,
  OPTIONS_PER_QUESTION,
  POINTS_PER_CORRECT,
  QUESTIONS_PER_GAME,
  SECONDS_PER_QUESTION,
  getCorrectCount,
  getResultMessage,
} from "../src/quiz/scoring";

describe("scoring constants", () => {
  it("match the game rules in PROJECT_CONTEXT.md", () => {
    expect(QUESTIONS_PER_GAME).toBe(10);
    expect(OPTIONS_PER_QUESTION).toBe(4);
    expect(SECONDS_PER_QUESTION).toBe(10);
    expect(POINTS_PER_CORRECT).toBe(10);
    expect(MAX_SCORE).toBe(100);
  });
});

describe("getCorrectCount", () => {
  it("converts score to number of correct answers", () => {
    expect(getCorrectCount(0)).toBe(0);
    expect(getCorrectCount(70)).toBe(7);
    expect(getCorrectCount(100)).toBe(10);
  });
});

describe("getResultMessage", () => {
  it("returns a message for every possible score", () => {
    for (let score = 0; score <= MAX_SCORE; score += POINTS_PER_CORRECT) {
      expect(getResultMessage(score).length).toBeGreaterThan(0);
    }
  });

  it.each([
    [100, "Nigeria Expert! 🏆"],
    [90, "Nigeria Expert! 🏆"],
    [80, "Great Job! 🔥"],
    [70, "Great Job! 🔥"],
    [60, "Not Bad! 👍"],
    [50, "Not Bad! 👍"],
    [40, "Keep Learning! 📚"],
    [0, "Keep Learning! 📚"],
  ])("score %i -> %s", (score, message) => {
    expect(getResultMessage(score)).toBe(message);
  });
});

describe("result message band boundaries", () => {
  it.each([
    [100, "Nigeria Expert! 🏆"],
    [99, "Nigeria Expert! 🏆"],
    [90, "Nigeria Expert! 🏆"],
    [89, "Great Job! 🔥"],
    [70, "Great Job! 🔥"],
    [69, "Not Bad! 👍"],
    [50, "Not Bad! 👍"],
    [49, "Keep Learning! 📚"],
    [0, "Keep Learning! 📚"],
  ])("score %i -> %s", (score, message) => {
    expect(getResultMessage(score)).toBe(message);
  });

  it("derives the correct-answer count from the score for every possible game", () => {
    for (let correct = 0; correct <= QUESTIONS_PER_GAME; correct++) {
      expect(getCorrectCount(correct * POINTS_PER_CORRECT)).toBe(correct);
    }
  });
});
