import { describe, expect, it } from "vitest";
import { allQuestions } from "@/data/questions";
import { initialState, quizReducer } from "@/lib/quiz/quizReducer";
import { selectQuestions } from "@/lib/quiz/selectQuestions";
import { MAX_SCORE, POINTS_PER_CORRECT, getCorrectCount } from "@/lib/quiz/scoring";
import type { QuizAction, QuizState } from "@/lib/types";

const run = (state: QuizState, ...actions: QuizAction[]) =>
  actions.reduce(quizReducer, state);

const questions = selectQuestions(allQuestions, "general-knowledge");
const started = () =>
  run(initialState, {
    type: "START_QUIZ",
    category: "general-knowledge",
    questions,
  });

const correctOf = (s: QuizState) => s.questions[s.currentIndex].answer;
const wrongOf = (s: QuizState) =>
  s.questions[s.currentIndex].options.find((o) => o !== correctOf(s))!;

describe("navigation", () => {
  it("starts on the home screen", () => {
    expect(initialState.screen).toBe("home");
  });

  it("goes home -> categories -> quiz", () => {
    const s = run(initialState, { type: "GO_TO_CATEGORIES" });
    expect(s.screen).toBe("category");
    const q = started();
    expect(q).toMatchObject({
      screen: "quiz",
      category: "general-knowledge",
      currentIndex: 0,
      phase: "answering",
      score: 0,
    });
    expect(q.questions).toHaveLength(10);
  });

  it("GO_HOME and GO_TO_CATEGORIES reset the game", () => {
    const mid = run(started(), { type: "ANSWER", option: correctOf(started()) });
    expect(run(mid, { type: "GO_HOME" })).toEqual(initialState);
    const cat = run(mid, { type: "GO_TO_CATEGORIES" });
    expect(cat.screen).toBe("category");
    expect(cat.score).toBe(0);
    expect(cat.questions).toEqual([]);
  });

  it("starting again resets the score and progress (play again)", () => {
    let s = started();
    s = run(s, { type: "ANSWER", option: correctOf(s) }, { type: "NEXT" });
    const again = run(s, {
      type: "START_QUIZ",
      category: "general-knowledge",
      questions,
    });
    expect(again.score).toBe(0);
    expect(again.currentIndex).toBe(0);
  });
});

describe("answering", () => {
  it("awards 10 points and enters feedback on a correct answer", () => {
    const s0 = started();
    const s = run(s0, { type: "ANSWER", option: correctOf(s0) });
    expect(s.phase).toBe("feedback");
    expect(s.score).toBe(POINTS_PER_CORRECT);
    expect(s.selectedAnswer).toBe(correctOf(s0));
    expect(s.timedOut).toBe(false);
  });

  it("awards 0 points on a wrong answer", () => {
    const s0 = started();
    const s = run(s0, { type: "ANSWER", option: wrongOf(s0) });
    expect(s.phase).toBe("feedback");
    expect(s.score).toBe(0);
    expect(s.selectedAnswer).toBe(wrongOf(s0));
  });

  it("cannot change the answer once selected", () => {
    const s0 = started();
    const wrong = run(s0, { type: "ANSWER", option: wrongOf(s0) });
    const after = run(wrong, { type: "ANSWER", option: correctOf(s0) });
    expect(after).toBe(wrong);
    expect(after.score).toBe(0);
  });

  it("cannot score twice for the same question", () => {
    const s0 = started();
    const once = run(s0, { type: "ANSWER", option: correctOf(s0) });
    const twice = run(once, { type: "ANSWER", option: correctOf(s0) });
    expect(twice.score).toBe(POINTS_PER_CORRECT);
  });
});

describe("timeout", () => {
  it("gives 0 points, no selection, and flags timedOut", () => {
    const s = run(started(), { type: "TIME_UP" });
    expect(s.phase).toBe("feedback");
    expect(s.selectedAnswer).toBeNull();
    expect(s.timedOut).toBe(true);
    expect(s.score).toBe(0);
  });

  it("is ignored if the player already answered", () => {
    const s0 = started();
    const answered = run(s0, { type: "ANSWER", option: correctOf(s0) });
    const after = run(answered, { type: "TIME_UP" });
    expect(after).toBe(answered);
    expect(after.timedOut).toBe(false);
  });

  it("blocks answering after time is up", () => {
    const s0 = started();
    const timedOut = run(s0, { type: "TIME_UP" });
    expect(run(timedOut, { type: "ANSWER", option: correctOf(s0) })).toBe(timedOut);
  });
});

describe("next", () => {
  it("is ignored while still answering", () => {
    const s = started();
    expect(run(s, { type: "NEXT" })).toBe(s);
  });

  it("moves to the next question and clears per-question state", () => {
    let s = started();
    s = run(s, { type: "TIME_UP" }, { type: "NEXT" });
    expect(s.currentIndex).toBe(1);
    expect(s.phase).toBe("answering");
    expect(s.selectedAnswer).toBeNull();
    expect(s.timedOut).toBe(false);
    expect(s.screen).toBe("quiz");
  });

  it("goes to results after question 10", () => {
    let s = started();
    for (let i = 0; i < 10; i++) {
      s = run(s, { type: "TIME_UP" }, { type: "NEXT" });
    }
    expect(s.screen).toBe("results");
    expect(s.score).toBe(0);
  });
});

describe("full games", () => {
  it("scores 100 when every answer is correct", () => {
    let s = started();
    for (let i = 0; i < 10; i++) {
      s = run(s, { type: "ANSWER", option: correctOf(s) }, { type: "NEXT" });
    }
    expect(s.screen).toBe("results");
    expect(s.score).toBe(MAX_SCORE);
  });

  it("scores a mix of correct, wrong and timed-out answers", () => {
    let s = started();
    for (let i = 0; i < 10; i++) {
      if (i % 3 === 0) s = run(s, { type: "ANSWER", option: correctOf(s) });
      else if (i % 3 === 1) s = run(s, { type: "ANSWER", option: wrongOf(s) });
      else s = run(s, { type: "TIME_UP" });
      s = run(s, { type: "NEXT" });
    }
    expect(s.score).toBe(40); // i = 0, 3, 6, 9
  });
});

describe("results and replay", () => {
  /** Plays a full game, answering correctly for the first `correctCount` questions. */
  const finishGame = (correctCount: number, start: QuizState = started()) => {
    let s = start;
    for (let i = 0; i < 10; i++) {
      s =
        i < correctCount
          ? run(s, { type: "ANSWER", option: correctOf(s) })
          : run(s, { type: "ANSWER", option: wrongOf(s) });
      s = run(s, { type: "NEXT" });
    }
    return s;
  };

  it.each([
    [9, 90],
    [7, 70],
    [5, 50],
    [4, 40],
  ])("%i correct answers end on the results screen with score %i", (correct, score) => {
    const s = finishGame(correct);
    expect(s.screen).toBe("results");
    expect(s.score).toBe(score);
    expect(getCorrectCount(s.score)).toBe(correct);
  });

  it("keeps the category and questions on the results screen", () => {
    const s = finishGame(6);
    expect(s.category).toBe("general-knowledge");
    expect(s.questions).toHaveLength(10);
  });

  it("replay (START_QUIZ from results) resets score, progress and phase for the same category", () => {
    const results = finishGame(8);
    const freshQuestions = selectQuestions(allQuestions, results.category!);
    const again = run(results, {
      type: "START_QUIZ",
      category: results.category!,
      questions: freshQuestions,
    });
    expect(again).toMatchObject({
      screen: "quiz",
      category: "general-knowledge",
      currentIndex: 0,
      phase: "answering",
      selectedAnswer: null,
      timedOut: false,
      score: 0,
    });
    expect(again.questions).toBe(freshQuestions);
    expect(new Set(again.questions.map((q) => q.id)).size).toBe(10);
    expect(again.questions.every((q) => q.category === "general-knowledge")).toBe(true);
  });

  it("a replayed game scores independently of the previous one", () => {
    const first = finishGame(10);
    expect(first.score).toBe(MAX_SCORE);
    const again = run(first, {
      type: "START_QUIZ",
      category: first.category!,
      questions: selectQuestions(allQuestions, first.category!),
    });
    expect(finishGame(3, again).score).toBe(30);
  });

  it("choosing another category from results returns to category selection with a clean state", () => {
    const s = run(finishGame(6), { type: "GO_TO_CATEGORIES" });
    expect(s).toEqual({ ...initialState, screen: "category" });
  });

  it("results screen ignores game actions", () => {
    const results = finishGame(6);
    expect(run(results, { type: "ANSWER", option: "x" })).toBe(results);
    expect(run(results, { type: "TIME_UP" })).toBe(results);
    expect(run(results, { type: "NEXT" })).toBe(results);
  });
});
