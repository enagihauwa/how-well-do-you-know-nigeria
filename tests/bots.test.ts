import { afterEach, describe, expect, it, vi } from "vitest";
import { noTalkAmCards } from "@/data/noTalkAmCards";
import { allQuestions } from "@/data/questions";
import { sortItems } from "@/data/sortItems";
import { yearItems } from "@/data/yearItems";
import { BOT_ACCURACY, battleRoyaleMode } from "@/lib/modes/battleRoyale";
import {
  BOT_START_MS,
  botMoves,
  createPublicRoom,
  createRoom,
  roomDisconnect,
  roomNextDeadline,
  roomReduce,
  roomTick,
  roomView,
  roomViews,
  type RoomEnv,
  type RoomState,
} from "@/lib/room/engine";
import type { ModeId } from "@/lib/modes/types";
import { RoomHost } from "@/lib/room/host";
import type { ServerMessage } from "@/lib/room/protocol";
import { ctxWith, seededRng } from "./helpers";

const content = { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems };
const env: RoomEnv = { now: 1_000_000, rng: seededRng(), content };
const options = { mode: "battle-royale" as const, minPlayers: 6, maxPlayers: 50, countdownMs: 25_000, squadSize: null, botFillMs: 10_000 };
const join = (s: RoomState, id: string, now = env.now) => roomReduce(s, id, { type: "join", name: id }, { ...env, now }).state;

describe("bots fill a short Quick Play room", () => {
  it("a lone player gets bots after the wait, then the match starts", () => {
    let s = join(createPublicRoom("SOLO1", options), "ada");
    expect(roomView(s, "ada", env).botsAt).toBe(env.now + 10_000);
    expect(roomNextDeadline(s)).toBe(env.now + 10_000);

    s = roomTick(s, { ...env, now: env.now + 10_000 });
    const bots = s.players.filter((p) => p.bot);
    expect(bots).toHaveLength(5);
    expect(new Set(bots.map((b) => b.name)).size).toBe(5);
    expect(s.autoStart?.startsAt).toBe(env.now + 10_000 + BOT_START_MS);

    s = roomTick(s, { ...env, now: env.now + 10_000 + BOT_START_MS });
    expect(s.status).toBe("playing");
    // Views go to people only, and bots are labelled in them.
    expect([...roomViews(s, env).keys()]).toEqual(["ada"]);
    expect(roomView(s, "ada", env).players.filter((p) => p.bot)).toHaveLength(5);
  });

  it("adds no bots when enough people come, or when nobody is there", () => {
    let full = createPublicRoom("FULL1", options);
    for (const id of ["a", "b", "c", "d", "e", "f"]) full = join(full, id);
    expect(roomView(full, "a", env).botsAt).toBeNull();

    const empty = roomReduce(join(createPublicRoom("EMPT1", options), "a"), "a", { type: "leave" }, env).state;
    expect(roomTick(empty, { ...env, now: env.now + 60_000 }).players).toHaveLength(0);
  });

  it("bots can't be disconnected, so a room fills once and then starts", () => {
    let s = roomTick(join(createPublicRoom("ONCE1", options), "ada"), { ...env, now: env.now + 10_000 });
    const bots = s.players.filter((p) => p.bot).map((p) => p.id);
    // A transport that never hears from bots (they send no heartbeats) tries to drop them.
    for (const id of bots) s = roomDisconnect(s, id, { ...env, now: env.now + 12_000 });
    s = roomTick(s, { ...env, now: env.now + 12_000 });
    expect(s.players.filter((p) => p.bot)).toHaveLength(5);
    s = roomTick(s, { ...env, now: env.now + 10_000 + BOT_START_MS });
    expect(s.status).toBe("playing");
  });

  it("only tops up to the minimum", () => {
    let s = join(join(createPublicRoom("TWO01", options), "a"), "b");
    s = roomTick(s, { ...env, now: env.now + 10_000 });
    expect(s.players.filter((p) => p.bot)).toHaveLength(4);
  });
});

describe("bot answers", () => {
  const players = ["bot-1", "x"].map((id) => ({ id, name: id, teamId: "t0" }));

  it("answer once per question, after a human-like pause, right about as often as their accuracy", () => {
    const rng = seededRng(3);
    const ctx = ctxWith(players, { rng });
    let right = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const s = battleRoyaleMode.start({ lives: 2, squads: false, maxQuestions: 30 }, allQuestions, ctx);
      const plan = battleRoyaleMode.botAction!(s, "bot-1", ctx)!;
      expect(plan.afterMs).toBeGreaterThanOrEqual(2000);
      expect(plan.afterMs).toBeLessThanOrEqual(9000);
      if (plan.action.option === s.questions[0].answer) right++;
    }
    // The first question is always easy.
    expect(right / runs).toBeCloseTo(BOT_ACCURACY.easy, 1);

    const s = battleRoyaleMode.start({ lives: 2, squads: false, maxQuestions: 30 }, allQuestions, ctx);
    const answered = battleRoyaleMode.reduce(s, "bot-1", { type: "lock", option: s.questions[0].options[0] }, ctx);
    expect(battleRoyaleMode.botAction!(answered, "bot-1", ctx)).toBeNull();
  });
});

describe("RoomHost runs the bots", () => {
  afterEach(() => vi.useRealTimers());

  it("a lone player plays a whole battle royale against bots to the end", () => {
    vi.useFakeTimers();
    let now = env.now;
    vi.setSystemTime(now);
    const messages: ServerMessage[] = [];
    const host = new RoomHost(createPublicRoom("SOLO2", options), {
      content,
      now: () => Date.now(),
      rng: seededRng(9),
      send: (to, m) => to === "ada" && messages.push(m),
    });
    host.handle("ada", { type: "join", name: "Ada" });

    // Ada never answers; the bots must carry the match to its end on their own.
    for (let i = 0; i < 2000 && host.room.status !== "finished"; i++) {
      now += 500;
      vi.advanceTimersByTime(500);
    }
    expect(host.room.status).toBe("finished");
    expect(host.room.summary?.placements).toHaveLength(6);
    const lastView = messages.filter((m) => m.type === "view").at(-1);
    expect(lastView?.type === "view" && lastView.view.status).toBe("finished");
    host.dispose();
  });

  it("bots in a private room play every match, not just the first", () => {
    vi.useFakeTimers();
    vi.setSystemTime(env.now);
    const host = new RoomHost(createRoom("PRIV1", "sort-am"), { content, now: () => Date.now(), rng: seededRng(4), send: () => {} });
    host.handle("ada", { type: "join", name: "Ada" });
    host.handle("ada", { type: "set_team", teamId: "t0" });
    host.handle("ada", { type: "add_bot" });
    host.handle("ada", { type: "add_bot" });
    const bots = host.room.players.filter((p) => p.bot).map((p) => p.id);
    expect(bots).toHaveLength(2);

    for (let match = 0; match < 2; match++) {
      host.handle("ada", { type: "start" });
      for (let i = 0; i < 2000 && host.room.status !== "finished"; i++) vi.advanceTimersByTime(500);
      expect(host.room.status).toBe("finished");
      // A bot's sort is at most two swaps from right, so it scores every round it answers.
      for (const id of bots) expect(host.room.summary?.playerScores[id]).toBeGreaterThan(0);
      host.handle("ada", { type: "back_to_lobby" });
    }
    host.dispose();
  });
});

describe("bots in a private room", () => {
  const lobbyWith = (mode: ModeId) => {
    let s = join(createRoom("PRIV2", mode), "ada");
    s = roomReduce(s, "ada", { type: "set_team", teamId: "t0" }, env).state;
    return join(s, "bayo");
  };

  it("only the host adds bots; they fill the emptiest team and are never host", () => {
    let s = lobbyWith("trivia");
    expect(roomReduce(s, "bayo", { type: "add_bot" }, env).error).toBe("not_host");
    s = roomReduce(s, "ada", { type: "add_bot" }, env).state;
    s = roomReduce(s, "ada", { type: "add_bot" }, env).state;
    const bots = s.players.filter((p) => p.bot);
    expect(bots.map((b) => b.teamId)).toEqual(["t1", "t0"]);
    expect(new Set(s.players.map((p) => p.name)).size).toBe(s.players.length);

    s = roomReduce(s, "ada", { type: "leave" }, env).state;
    expect(s.hostId).toBe("bayo");
    s = roomReduce(s, "bayo", { type: "leave" }, env).state;
    expect(s.hostId).toBeNull();
  });

  it("are refused for games bots can't play, and block starting one", () => {
    const s = lobbyWith("no-talk-am");
    expect(roomReduce(s, "ada", { type: "add_bot" }, env).error).toBe("bots_unsupported");

    let withBot = roomReduce(lobbyWith("trivia"), "ada", { type: "add_bot" }, env).state;
    withBot = roomReduce(withBot, "bayo", { type: "set_team", teamId: "t1" }, env).state;
    withBot = roomReduce(withBot, "ada", { type: "set_mode", mode: "no-talk-am" }, env).state;
    expect(roomReduce(withBot, "ada", { type: "start" }, env).error).toBe("bots_unsupported");
  });

  it("in team-lock trivia, never answer for a team that has people on it", () => {
    let s = lobbyWith("trivia");
    s = roomReduce(s, "bayo", { type: "set_team", teamId: "t0" }, env).state;
    // Ada and Bayo are on t0, so both bots go to the emptier t1.
    s = roomReduce(s, "ada", { type: "add_bot" }, env).state;
    s = roomReduce(s, "ada", { type: "add_bot" }, env).state;
    expect(s.players.filter((p) => p.bot).map((p) => p.teamId)).toEqual(["t1", "t1"]);
    s = roomReduce(s, "ada", { type: "start" }, env).state;
    const t1Bots = s.players.filter((p) => p.bot).map((p) => p.id);
    // One move, from the first bot on the all-bot team; nothing for the people's team.
    expect(botMoves(s, env).map((m) => m.botId)).toEqual([t1Bots[0]]);
  });
});
