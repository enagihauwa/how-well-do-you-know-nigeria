import { describe, expect, it } from "vitest";
import { allQuestions } from "@/data/questions";
import { QUESTION_MS, REVEAL_MS, triviaMode, type TriviaConfig, type TriviaState } from "@/lib/modes/trivia";
import { ctxWith } from "./helpers";

const players = [
  { id: "ada", name: "Ada", teamId: "t0" },
  { id: "bayo", name: "Bayo", teamId: "t0" },
  { id: "chidi", name: "Chidi", teamId: "t1" },
];
const ctx = ctxWith(players);
const at = (now: number) => ({ ...ctx, now });

const start = (answerRule: TriviaConfig["answerRule"]) =>
  triviaMode.start({ category: "general-knowledge", answerRule }, allQuestions, ctx);

const answerOf = (s: TriviaState) => s.questions[s.index].answer;
const wrongOf = (s: TriviaState) => s.questions[s.index].options.find((o) => o !== answerOf(s))!;
const lock = (s: TriviaState, who: string, option: string, now = ctx.now) =>
  triviaMode.reduce(s, who, { type: "lock", option }, at(now));

describe("start", () => {
  it("deals 10 questions with a server deadline and zero scores", () => {
    const s = start("team_lock");
    expect(s.questions).toHaveLength(10);
    expect(s.phase).toBe("question");
    expect(s.endsAt).toBe(ctx.now + QUESTION_MS);
    expect(s.teamScores).toEqual({ t0: 0, t1: 0 });
    expect(s.playerScores).toEqual({ ada: 0, bayo: 0, chidi: 0 });
  });

  it("refuses a category without enough questions", () => {
    expect(triviaMode.canStart({ category: "general-knowledge", answerRule: "individual" }, [], ctx)).toBe(
      "not_enough_content",
    );
    expect(triviaMode.canStart(triviaMode.defaultConfig, allQuestions, ctx)).toBeNull();
  });
});

describe("secrets", () => {
  it("never sends the answer while the question is open", () => {
    const s = start("team_lock");
    const view = triviaMode.view(s, "ada", ctx);
    expect(view.answer).toBeNull();
    expect(JSON.stringify(view)).not.toContain(`"answer":"`);
  });

  it("individual: teammates cannot see each other's pick before the reveal", () => {
    const fresh = start("individual");
    const s = lock(fresh, "ada", fresh.questions[0].options[0]);
    expect(triviaMode.view(s, "ada", ctx).myLock).not.toBeNull();
    expect(triviaMode.view(s, "bayo", ctx).myLock).toBeNull();
    expect(triviaMode.view(s, "bayo", ctx).reveals).toEqual([]);
  });

  it("team_lock: the team sees its lock, the other team does not", () => {
    let s = start("team_lock");
    s = lock(s, "ada", answerOf(s));
    expect(triviaMode.view(s, "bayo", ctx)).toMatchObject({ myLock: answerOf(s), myLockBy: "ada" });
    expect(triviaMode.view(s, "chidi", ctx).myLock).toBeNull();
  });
});

describe("team_lock", () => {
  it("any teammate can change the team's pick before the reveal; the latest pick counts", () => {
    let s = start("team_lock");
    s = lock(s, "ada", wrongOf(s));
    s = lock(s, "bayo", answerOf(s));
    expect(triviaMode.view(s, "ada", ctx)).toMatchObject({ myLock: answerOf(s), myLockBy: "bayo" });
    s = lock(s, "chidi", wrongOf(s));
    expect(s.teamScores.t0).toBe(10);
  });

  it("reveals as soon as every team has locked, and scores the team and the locker", () => {
    let s = start("team_lock");
    s = lock(s, "ada", answerOf(s));
    expect(s.phase).toBe("question");
    s = lock(s, "chidi", wrongOf(s));
    expect(s.phase).toBe("reveal");
    expect(s.teamScores).toEqual({ t0: 10, t1: 0 });
    expect(s.playerScores).toMatchObject({ ada: 10, bayo: 0, chidi: 0 });
    const view = triviaMode.view(s, "chidi", ctx);
    expect(view.answer).toBe(answerOf(s));
    expect(view.reveals).toEqual([
      { teamId: "t0", playerId: "ada", option: answerOf(s), correct: true },
      { teamId: "t1", playerId: "chidi", option: wrongOf(s), correct: false },
    ]);
  });
});

describe("individual", () => {
  it("waits for every player, then adds up each correct answer", () => {
    let s = start("individual");
    s = lock(s, "ada", answerOf(s));
    s = lock(s, "bayo", answerOf(s));
    expect(s.phase).toBe("question");
    s = lock(s, "chidi", answerOf(s));
    expect(s.phase).toBe("reveal");
    expect(s.teamScores).toEqual({ t0: 20, t1: 10 });
  });

  it("lets a player change their pick until the reveal, then not", () => {
    let s = start("individual");
    s = lock(s, "ada", wrongOf(s));
    s = lock(s, "ada", answerOf(s));
    expect(s.phase).toBe("question");
    s = lock(lock(s, "bayo", answerOf(s)), "chidi", answerOf(s));
    expect(s.phase).toBe("reveal");
    expect(s.teamScores.t0).toBe(20);
    expect(lock(s, "ada", wrongOf(s))).toBe(s);
  });
});

describe("timing", () => {
  it("ignores locks after the deadline and reveals on tick", () => {
    const s = start("individual");
    expect(lock(s, "ada", answerOf(s), s.endsAt)).toBe(s);
    expect(triviaMode.tick(s, at(s.endsAt - 1))).toBe(s);
    const revealed = triviaMode.tick(s, at(s.endsAt));
    expect(revealed.phase).toBe("reveal");
    expect(revealed.teamScores).toEqual({ t0: 0, t1: 0 });
  });

  it("only the host can skip the reveal; otherwise it auto-advances", () => {
    const s = triviaMode.tick(start("team_lock"), at(ctx.now + QUESTION_MS));
    expect(triviaMode.reduce(s, "chidi", { type: "next" }, at(s.endsAt - 1))).toBe(s);
    expect(triviaMode.reduce(s, "ada", { type: "next" }, at(s.endsAt - 1)).index).toBe(1);
    const auto = triviaMode.tick(s, at(ctx.now + QUESTION_MS + REVEAL_MS));
    expect(auto).toMatchObject({ index: 1, phase: "question", teamLocks: {}, playerLocks: {} });
  });

  it("reveals early when the only player still to answer leaves", () => {
    let s = start("individual");
    s = lock(s, "ada", answerOf(s));
    s = lock(s, "chidi", answerOf(s));
    const withoutBayo = { ...ctx, players: players.filter((p) => p.id !== "bayo") };
    expect(triviaMode.tick(s, withoutBayo).phase).toBe("reveal");
  });

  it("finishes after the tenth reveal", () => {
    let s = start("team_lock");
    let now = ctx.now;
    for (let i = 0; i < 10; i++) {
      now += QUESTION_MS;
      s = triviaMode.tick(s, at(now));
      now += REVEAL_MS;
      s = triviaMode.tick(s, at(now));
    }
    expect(triviaMode.isFinished(s)).toBe(true);
    expect(triviaMode.nextDeadline(s)).toBeNull();
    expect(triviaMode.view(s, "ada", ctx).question).toBeNull();
  });
});
