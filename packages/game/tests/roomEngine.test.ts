import { describe, expect, it } from "vitest";
import { noTalkAmCards } from "../src/data/noTalkAmCards";
import { allQuestions } from "../src/data/questions";
import { sortItems } from "../src/data/sortItems";
import { yearItems } from "../src/data/yearItems";
import type { TriviaView } from "../src/modes/trivia";
import { generateRoomCode, isRoomCode, normalizeRoomCode } from "../src/room/code";
import {
  CHAT_BURST,
  CHAT_HISTORY,
  CHAT_MAX_LENGTH,
  CHAT_WINDOW_MS,
  HOST_GRACE_MS,
  MAX_PLAYERS,
  SEAT_HOLD_MS,
  chatFor,
  createRoom,
  roomDisconnect,
  roomNextDeadline,
  roomReduce,
  roomTick,
  roomView,
  roomViews,
  type ClientAction,
  type RoomEnv,
  type RoomState,
} from "../src/room/engine";
import { seededRng } from "./helpers";

const env: RoomEnv = {
  now: 1_000_000,
  rng: seededRng(),
  content: { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems },
};

function apply(state: RoomState, ...steps: [string, ClientAction][]): RoomState {
  return steps.reduce((s, [from, action]) => {
    const result = roomReduce(s, from, action, env);
    if (result.error) throw new Error(`${from} ${action.type}: ${result.error}`);
    return result.state;
  }, state);
}

const lobby = () =>
  apply(
    createRoom("ABCDE"),
    ["ada", { type: "join", name: "Ada" }],
    ["bayo", { type: "join", name: "Bayo" }],
    ["ada", { type: "set_team", teamId: "t0" }],
    ["bayo", { type: "set_team", teamId: "t1" }],
  );

describe("room codes", () => {
  it("generates readable codes and normalises typed ones", () => {
    const code = generateRoomCode(seededRng(7));
    expect(isRoomCode(code)).toBe(true);
    expect(isRoomCode("O0I1L")).toBe(false);
    expect(normalizeRoomCode(" abc-de ")).toBe("ABCDE");
  });
});

describe("joining", () => {
  it("the first player is host", () => {
    const s = lobby();
    expect(s.hostId).toBe("ada");
    expect(s.players.map((p) => p.name)).toEqual(["Ada", "Bayo"]);
  });

  it("opens on trivia, or on the game the room was created with", () => {
    expect(createRoom("ABCDE").settings.mode).toBe("trivia");
    expect(createRoom("ABCDE", "sort-am").settings.mode).toBe("sort-am");
  });

  it("cleans names and rejects empty ones", () => {
    expect(roomReduce(createRoom("ABCDE"), "x", { type: "join", name: "   " }, env).error).toBe("invalid_name");
    const s = apply(createRoom("ABCDE"), ["x", { type: "join", name: "  Tunde   Bakare  " }]);
    expect(s.players[0].name).toBe("Tunde Bakare");
  });

  it(`caps the room at ${MAX_PLAYERS}`, () => {
    let s = createRoom("ABCDE");
    for (let i = 0; i < MAX_PLAYERS; i++) s = apply(s, [`p${i}`, { type: "join", name: `P${i}` }]);
    expect(roomReduce(s, "late", { type: "join", name: "Late" }, env).error).toBe("room_full");
  });

  it("lets a player rejoin their seat mid-match but not a newcomer", () => {
    const playing = apply(lobby(), ["ada", { type: "start" }]);
    expect(roomReduce(playing, "new", { type: "join", name: "New" }, env).error).toBe("already_started");
    const dropped = roomDisconnect(playing, "bayo", env);
    const back = apply(dropped, ["bayo", { type: "join", name: "Bayo" }]);
    expect(back.players.find((p) => p.id === "bayo")).toMatchObject({ connected: true, teamId: "t1" });
  });
});

describe("host", () => {
  it("only the host changes settings and starts", () => {
    const s = lobby();
    expect(roomReduce(s, "bayo", { type: "start" }, env).error).toBe("not_host");
    expect(roomReduce(s, "bayo", { type: "set_mode", mode: "no-talk-am" }, env).error).toBe("not_host");
    expect(apply(s, ["ada", { type: "set_trivia", answerRule: "individual" }]).settings.configs.trivia.answerRule).toBe(
      "individual",
    );
  });

  it("passes to the next player when the host leaves", () => {
    const s = apply(lobby(), ["chi", { type: "join", name: "Chi" }]);
    expect(apply(s, ["ada", { type: "leave" }]).hostId).toBe("bayo");
  });

  it("keeps a dropped host for a grace period, then passes the role on", () => {
    const dropped = roomDisconnect(lobby(), "ada", env);
    expect(dropped.hostId).toBe("ada");
    expect(roomNextDeadline(dropped)).toBe(env.now + HOST_GRACE_MS);
    expect(roomTick(dropped, { ...env, now: env.now + HOST_GRACE_MS - 1 }).hostId).toBe("ada");
    expect(roomTick(dropped, { ...env, now: env.now + HOST_GRACE_MS }).hostId).toBe("bayo");
  });

  it("a host who reconnects within the grace period is still host", () => {
    const dropped = roomDisconnect(lobby(), "ada", env);
    const back = roomReduce(dropped, "ada", { type: "join", name: "Ada" }, { ...env, now: env.now + 3000 }).state;
    expect(roomTick(back, { ...env, now: env.now + HOST_GRACE_MS * 2 }).hostId).toBe("ada");
  });

  it("can kick a player, who cannot come back", () => {
    const s = apply(lobby(), ["ada", { type: "kick", playerId: "bayo" }]);
    expect(s.players.map((p) => p.id)).toEqual(["ada"]);
    expect(roomReduce(s, "bayo", { type: "join", name: "Bayo" }, env).error).toBe("kicked");
  });
});

describe("teams", () => {
  it("adds up to 4 teams and removing one moves its players to no team", () => {
    let s = apply(lobby(), ["ada", { type: "add_team" }], ["ada", { type: "add_team" }], ["ada", { type: "add_team" }]);
    expect(s.teamIds).toEqual(["t0", "t1", "t2", "t3"]);
    s = apply(s, ["ada", { type: "remove_team", teamId: "t1" }]);
    expect(s.teamIds).toEqual(["t0", "t2", "t3"]);
    expect(s.players.find((p) => p.id === "bayo")!.teamId).toBeNull();
    s = apply(s, ["ada", { type: "add_team" }]);
    expect(s.teamIds).toEqual(["t0", "t1", "t2", "t3"]);
  });

  it("cannot switch teams once the match has started", () => {
    const playing = apply(lobby(), ["ada", { type: "start" }]);
    expect(apply(playing, ["bayo", { type: "set_team", teamId: "t0" }])).toBe(playing);
  });
});

describe("starting", () => {
  it("explains why it cannot start yet", () => {
    const solo = apply(createRoom("ABCDE"), ["ada", { type: "join", name: "Ada" }]);
    expect(roomView(solo, "ada", env).startProblem).toBe("need_players");
    const noTeam = apply(solo, ["bayo", { type: "join", name: "Bayo" }]);
    expect(roomView(noTeam, "ada", env).startProblem).toBe("need_team");
    expect(roomView(lobby(), "ada", env).startProblem).toBeNull();
    const nta = apply(lobby(), ["ada", { type: "set_mode", mode: "no-talk-am" }]);
    expect(roomView(nta, "ada", env).startProblem).toBe("need_two_per_team");
  });

  it("runs trivia and sends each player their own view", () => {
    const s = apply(lobby(), ["ada", { type: "start" }]);
    expect(s.status).toBe("playing");
    const view = roomView(s, "bayo", env);
    expect(view.match?.mode).toBe("trivia");
    expect((view.match as TriviaView).answer).toBeNull();
    expect(roomNextDeadline(s)).toBe((view.match as TriviaView).endsAt);
  });

  it("finishes the match, keeps the summary, and the host takes everyone back to the lobby", () => {
    let s = apply(lobby(), ["ada", { type: "start" }]);
    let now = env.now;
    while (s.status === "playing") {
      now = roomNextDeadline(s)!;
      s = roomTick(s, { ...env, now });
    }
    expect(s.status).toBe("finished");
    expect(s.summary?.teamScores).toEqual({ t0: 0, t1: 0 });
    s = apply(s, ["ada", { type: "back_to_lobby" }]);
    expect(s).toMatchObject({ status: "lobby", match: null });
  });
});

describe("seats", () => {
  it("holds a dropped player's seat, then removes them", () => {
    const s = roomDisconnect(lobby(), "bayo", env);
    expect(roomNextDeadline(s)).toBe(env.now + SEAT_HOLD_MS);
    expect(roomTick(s, { ...env, now: env.now + SEAT_HOLD_MS - 1 }).players).toHaveLength(2);
    expect(roomTick(s, { ...env, now: env.now + SEAT_HOLD_MS }).players.map((p) => p.id)).toEqual(["ada"]);
  });
});

describe("chat", () => {
  const say = (s: RoomState, from: string, text: string, toTeam = false, now = env.now) =>
    roomReduce(s, from, { type: "chat", text, toTeam }, { ...env, now });

  it("room messages reach everyone; team messages only the team", () => {
    let s = apply(lobby(), ["chi", { type: "join", name: "Chi" }], ["chi", { type: "set_team", teamId: "t0" }]);
    s = say(s, "ada", "  hello   all ").state;
    s = say(s, "ada", "our plan", true).state;
    expect(chatFor(s, "chi").map((m) => m.text)).toEqual(["hello all", "our plan"]);
    expect(chatFor(s, "bayo").map((m) => m.text)).toEqual(["hello all"]);
    expect(chatFor(s, "chi", 1).map((m) => m.id)).toEqual([2]);
  });

  it("caps length and history, and ignores empty messages", () => {
    let s = lobby();
    expect(say(s, "ada", "   ").state).toBe(s);
    s = say(s, "ada", "x".repeat(500)).state;
    expect(s.chat[0].text).toHaveLength(CHAT_MAX_LENGTH);
    for (let i = 0; i < CHAT_HISTORY + 10; i++) s = say(s, i % 2 ? "ada" : "bayo", `m${i}`, false, env.now + i * CHAT_WINDOW_MS).state;
    expect(s.chat).toHaveLength(CHAT_HISTORY);
    expect(s.chat.at(-1)!.id).toBe(CHAT_HISTORY + 11);
  });

  it("rate-limits bursts", () => {
    let s = lobby();
    for (let i = 0; i < CHAT_BURST; i++) s = say(s, "ada", `m${i}`).state;
    expect(say(s, "ada", "one more").error).toBe("chat_too_fast");
    expect(say(s, "ada", "later", false, env.now + CHAT_WINDOW_MS).error).toBeUndefined();
  });

  it("mutes the No Talk Am describer during a round", () => {
    let s = apply(
      lobby(),
      ["chi", { type: "join", name: "Chi" }],
      ["chi", { type: "set_team", teamId: "t0" }],
      ["dan", { type: "join", name: "Dan" }],
      ["dan", { type: "set_team", teamId: "t1" }],
      ["ada", { type: "set_mode", mode: "no-talk-am" }],
      ["ada", { type: "start" }],
    );
    const errors = ["ada", "bayo", "chi", "dan"].map((id) => say(s, id, "the word is…", true).error);
    // Exactly one describer per team is muted; guessers can still talk.
    expect(errors.filter((e) => e === "chat_blocked")).toHaveLength(2);
    expect(errors.filter((e) => e === undefined)).toHaveLength(2);
    s = roomTick(s, { ...env, now: env.now + 60_000 });
    expect(["ada", "bayo", "chi", "dan"].every((id) => !say(s, id, "gg").error)).toBe(true);
  });
});

describe("roomViews", () => {
  it("gives the same views as roomView, one per connected player", () => {
    const s = roomDisconnect(apply(lobby(), ["ada", { type: "start" }]), "bayo", env);
    const views = roomViews(s, env);
    expect([...views.keys()]).toEqual(["ada"]);
    expect(views.get("ada")).toEqual(roomView(s, "ada", env));
  });
});
