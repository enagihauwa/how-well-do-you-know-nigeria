import { describe, expect, it } from "vitest";
import { allQuestions } from "@/data/questions";
import { noTalkAmCards } from "@/data/noTalkAmCards";
import { sortItems } from "@/data/sortItems";
import { yearItems } from "@/data/yearItems";
import { BR_ANSWER_MS, BR_REVEAL_MS, battleRoyaleMode, placements, type BattleRoyaleState } from "@/lib/modes/battleRoyale";
import { createPublicRoom, roomNextDeadline, roomReduce, roomTick, roomView, type RoomEnv, type RoomState } from "@/lib/room/engine";
import { ctxWith, seededRng } from "./helpers";

const four = ["ada", "bayo", "chidi", "dupe"].map((id) => ({ id, name: id, teamId: "t0" }));
const ctx = ctxWith(four);
const at = (now: number) => ({ ...ctx, now });
const config = { lives: 2, squads: false, maxQuestions: 30 };
const start = () => battleRoyaleMode.start(config, allQuestions, ctx);
const right = (s: BattleRoyaleState) => s.questions[s.index].answer;
const wrong = (s: BattleRoyaleState) => s.questions[s.index].options.find((o) => o !== right(s))!;

/** Everyone locks (right or wrong), then the reveal ends and the next question starts. */
function round(s: BattleRoyaleState, correct: string[], now = ctx.now): BattleRoyaleState {
  for (const p of four) {
    if ((s.lives[p.id] ?? 0) > 0) {
      s = battleRoyaleMode.reduce(s, p.id, { type: "lock", option: correct.includes(p.id) ? right(s) : wrong(s) }, at(now));
    }
  }
  return s;
}

describe("Who Go Remain? (battle royale)", () => {
  it("deals easy questions before hard ones", () => {
    const order = ["easy", "medium", "hard"];
    const ranks = start().questions.map((q) => order.indexOf(q.difficulty));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("a wrong answer costs a life; out of lives, you are out and cannot answer", () => {
    let s = round(start(), ["ada", "bayo", "chidi"]);
    expect(s.phase).toBe("reveal");
    expect(s.lives.dupe).toBe(1);
    s = battleRoyaleMode.tick(s, at(s.endsAt));
    s = round(s, ["ada", "bayo", "chidi"]);
    expect(s.lives.dupe).toBe(0);
    expect(battleRoyaleMode.view(s, "dupe", ctx)).toMatchObject({ amIn: false, wentOut: ["dupe"], playersIn: 3 });
    s = battleRoyaleMode.tick(s, at(s.endsAt));
    expect(battleRoyaleMode.reduce(s, "dupe", { type: "lock", option: right(s) }, ctx)).toBe(s);
  });

  it("a pick can change until the reveal; the latest one counts", () => {
    let s = start();
    s = battleRoyaleMode.reduce(s, "ada", { type: "lock", option: wrong(s) }, ctx);
    s = battleRoyaleMode.reduce(s, "ada", { type: "lock", option: right(s) }, at(ctx.now + 1500));
    expect(s.answers.ada).toEqual({ option: right(s), ms: 1500 });
    for (const id of ["bayo", "chidi", "dupe"]) s = battleRoyaleMode.reduce(s, id, { type: "lock", option: wrong(s) }, ctx);
    expect(s.phase).toBe("reveal");
    expect(s.lives).toEqual({ ada: 2, bayo: 1, chidi: 1, dupe: 1 });
    expect(battleRoyaleMode.reduce(s, "ada", { type: "lock", option: wrong(s) }, ctx)).toBe(s);
  });

  it("mercy rule: if everyone still in is wrong, nobody loses a life", () => {
    const s = round(start(), []);
    expect(s.lastMercy).toBe(true);
    expect(Object.values(s.lives)).toEqual([2, 2, 2, 2]);
  });

  it("not answering in time counts as wrong", () => {
    let s = start();
    s = battleRoyaleMode.reduce(s, "ada", { type: "lock", option: right(s) }, ctx);
    s = battleRoyaleMode.tick(s, at(ctx.now + BR_ANSWER_MS));
    expect(s.lives).toEqual({ ada: 2, bayo: 1, chidi: 1, dupe: 1 });
  });

  it("shows how many picked each option at the reveal, and never the answer before it", () => {
    let s = start();
    expect(battleRoyaleMode.view(s, "ada", ctx).answer).toBeNull();
    s = round(s, ["ada", "bayo"]);
    const view = battleRoyaleMode.view(s, "ada", ctx);
    expect(view.optionCounts[right(s)]).toBe(2);
    expect(Object.values(view.optionCounts).reduce((a, b) => a + b, 0)).toBe(4);
  });

  it("ends with one left standing and places everyone by when they went out", () => {
    let s = start();
    let now = ctx.now;
    // Dupe out after 2 rounds, Chidi after 4, Bayo after 6; Ada never misses.
    const plan = [["ada", "bayo", "chidi"], ["ada", "bayo", "chidi"], ["ada", "bayo"], ["ada", "bayo"], ["ada"], ["ada"]];
    for (const correct of plan) {
      s = round(s, correct, now);
      now = s.endsAt;
      s = battleRoyaleMode.tick(s, at(now));
    }
    expect(battleRoyaleMode.isFinished(s)).toBe(true);
    expect(placements(s)).toEqual(["ada", "bayo", "chidi", "dupe"]);
    expect(battleRoyaleMode.view(s, "chidi", ctx).myPlace).toBe(3);
    expect(battleRoyaleMode.summary(s).placements).toEqual(["ada", "bayo", "chidi", "dupe"]);
  });

  it("squads: a squad stays in while any member does", () => {
    const squadCtx = ctxWith([
      { id: "ada", name: "ada", teamId: "s0" },
      { id: "bayo", name: "bayo", teamId: "s0" },
      { id: "chidi", name: "chidi", teamId: "s1" },
      { id: "dupe", name: "dupe", teamId: "s1" },
    ]);
    let s = battleRoyaleMode.start({ ...config, lives: 1, squads: true }, allQuestions, squadCtx);
    // Bayo and Dupe go out; one from each squad is left, so the match goes on.
    for (const id of ["ada", "chidi"]) s = battleRoyaleMode.reduce(s, id, { type: "lock", option: right(s) }, squadCtx);
    for (const id of ["bayo", "dupe"]) s = battleRoyaleMode.reduce(s, id, { type: "lock", option: wrong(s) }, squadCtx);
    s = battleRoyaleMode.tick(s, { ...squadCtx, now: s.endsAt });
    expect(s.phase).toBe("question");
    expect(battleRoyaleMode.view(s, "bayo", squadCtx).mySquad).toEqual([
      { id: "ada", in: true, lives: 1 },
      { id: "bayo", in: false, lives: 0 },
    ]);
  });
});

describe("Quick Play rooms", () => {
  const env: RoomEnv = {
    now: 1_000_000,
    rng: seededRng(),
    content: { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems },
  };
  const room = (squadSize: number | null = null) =>
    createPublicRoom("PUBLC", { mode: "battle-royale", minPlayers: 3, maxPlayers: 6, countdownMs: 20_000, squadSize, botFillMs: null });
  const join = (s: RoomState, ...ids: string[]) =>
    ids.reduce((acc, id) => roomReduce(acc, id, { type: "join", name: id }, env).state, s);

  it("has no host and no team picking", () => {
    const s = join(room(), "a", "b");
    expect(s.hostId).toBeNull();
    expect(roomReduce(s, "a", { type: "start" }, env).error).toBe("not_host");
    expect(roomReduce(s, "a", { type: "set_team", teamId: "t1" }, env).error).toBe("not_host");
  });

  it("starts a countdown at the minimum, and starts itself when it ends", () => {
    let s = join(room(), "a", "b");
    expect(roomView(s, "a", env).startsAt).toBeNull();
    s = join(s, "c");
    expect(s.autoStart?.startsAt).toBe(env.now + 20_000);
    expect(roomNextDeadline(s)).toBe(env.now + 20_000);
    s = roomTick(s, { ...env, now: env.now + 20_000 });
    expect(s.status).toBe("playing");
    expect(s.match?.modeId).toBe("battle-royale");
  });

  it("starts at once when full, and refuses anyone after that", () => {
    let s = join(room(), "a", "b", "c", "d", "e", "f");
    expect(s.autoStart?.startsAt).toBe(env.now);
    s = roomTick(s, env);
    expect(s.status).toBe("playing");
    expect(roomReduce(s, "g", { type: "join", name: "g" }, env).error).toBe("already_started");
  });

  it("deals squads at the start", () => {
    let s = join(room(2), "a", "b", "c", "d", "e", "f");
    s = roomTick(s, env);
    const sizes = Object.values(Object.groupBy(s.players, (p) => p.teamId!)).map((g) => g!.length);
    expect(sizes).toEqual([2, 2, 2]);
  });

  it("only allows quick-chat phrases", () => {
    const s = join(room(), "a", "b");
    expect(roomReduce(s, "a", { type: "chat", text: "my number is 080…", toTeam: false }, env).state.chat).toHaveLength(0);
    expect(roomReduce(s, "a", { type: "chat", text: "oya", toTeam: false }, env).state.chat[0].text).toBe("oya");
  });

  it("finishes with placements for the rankings", () => {
    let s = roomTick(join(room(), "a", "b", "c"), { ...env, now: env.now + 20_000 });
    let now = env.now + 20_000;
    while (s.status === "playing") {
      now = roomNextDeadline(s)!;
      s = roomTick(s, { ...env, now });
    }
    expect(s.summary?.placements).toHaveLength(3);
    expect(now - env.now).toBeLessThan(40 * (BR_ANSWER_MS + BR_REVEAL_MS));
  });
});
