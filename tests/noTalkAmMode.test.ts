import { describe, expect, it } from "vitest";
import { noTalkAmCards } from "@/data/noTalkAmCards";
import {
  BETWEEN_MS,
  describerFor,
  noTalkAmMode,
  type NoTalkAmState,
  type TabooCard,
} from "@/lib/modes/noTalkAm";
import { ctxWith } from "./helpers";

const players = [
  { id: "ada", name: "Ada", teamId: "t0" },
  { id: "bayo", name: "Bayo", teamId: "t0" },
  { id: "chidi", name: "Chidi", teamId: "t1" },
  { id: "dupe", name: "Dupe", teamId: "t1" },
  { id: "emeka", name: "Emeka", teamId: "t1" },
];
const ctx = ctxWith(players);
const at = (now: number) => ({ ...ctx, now });
const config = { roundSeconds: 60, rounds: null };
const start = () => noTalkAmMode.start(config, noTalkAmCards, ctx);

const describer = (s: NoTalkAmState, teamId: string) => describerFor(s, teamId, ctx)!;
const guesser = (s: NoTalkAmState, teamId: string) =>
  players.find((p) => p.teamId === teamId && p.id !== describer(s, teamId))!.id;
const guess = (s: NoTalkAmState, who: string, text: string, now = ctx.now) =>
  noTalkAmMode.reduce(s, who, { type: "guess", text }, at(now));

describe("canStart", () => {
  it("needs a describer and a guesser on every team that has players", () => {
    expect(noTalkAmMode.canStart(config, noTalkAmCards, ctx)).toBeNull();
    const lonely = ctxWith([...players, { id: "femi", name: "Femi", teamId: "t2" }]);
    expect(noTalkAmMode.canStart(config, noTalkAmCards, lonely)).toBe("need_two_per_team");
    expect(noTalkAmMode.canStart(config, [], ctx)).toBe("not_enough_content");
  });
});

describe("start", () => {
  it("plays one round per member of the biggest team, so everyone describes", () => {
    const s = start();
    expect(s.totalRounds).toBe(3);
    expect(s.phase).toBe("playing");
    expect(s.endsAt).toBe(ctx.now + 60_000);
    expect(Object.keys(s.cards).sort()).toEqual(["t0", "t1"]);
    expect(s.cards.t0.id).not.toBe(s.cards.t1.id);
  });
});

describe("secrets", () => {
  it("only the describer sees the word", () => {
    const s = start();
    const d = describer(s, "t0");
    expect(noTalkAmMode.view(s, d, ctx)).toMatchObject({ role: "describer", card: { word: s.cards.t0.word } });
    const otherDescriber = describer(s, "t1");
    for (const p of players.filter((p) => p.id !== d)) {
      const view = noTalkAmMode.view(s, p.id, ctx);
      // The other team's describer sees only their own card.
      expect(view.card).toEqual(
        p.id === otherDescriber ? { word: s.cards.t1.word, taboo: s.cards.t1.taboo } : null,
      );
      expect(JSON.stringify(view)).not.toContain(s.cards.t0.word);
    }
  });
});

describe("guessing", () => {
  it("a teammate's lenient guess scores for the team, the guesser and the describer", () => {
    const s = start();
    const word = s.cards.t0.word;
    const g = guesser(s, "t0");
    const after = guess(s, g, ` ${word.toLowerCase()}!`);
    expect(after.teamScores).toEqual({ t0: 10, t1: 0 });
    expect(after.playerScores[g]).toBe(10);
    expect(after.playerScores[describer(s, "t0")]).toBe(10);
    expect(after.cards.t0.id).not.toBe(s.cards.t0.id);
    expect(noTalkAmMode.view(after, g, ctx).myTeamWon).toEqual([word]);
  });

  it("accepts an alias", () => {
    const card: TabooCard = { id: "x", word: "Pounded yam", aliases: ["Iyan"], taboo: [] };
    const s = { ...start(), cards: { t0: card, t1: card } };
    expect(guess(s, guesser(s, "t0"), "iyan").teamScores.t0).toBe(10);
  });

  it("ignores wrong guesses, the describer guessing, the other team's word, and late guesses", () => {
    const s = start();
    expect(guess(s, guesser(s, "t0"), "definitely not it")).toBe(s);
    expect(guess(s, describer(s, "t0"), s.cards.t0.word)).toBe(s);
    expect(guess(s, guesser(s, "t1"), s.cards.t0.word)).toBe(s);
    expect(guess(s, guesser(s, "t0"), s.cards.t0.word, s.endsAt)).toBe(s);
  });

  it("only the describer can skip, for no points", () => {
    const s = start();
    expect(noTalkAmMode.reduce(s, guesser(s, "t0"), { type: "skip" }, ctx)).toBe(s);
    const skipped = noTalkAmMode.reduce(s, describer(s, "t0"), { type: "skip" }, ctx);
    expect(skipped.cards.t0.id).not.toBe(s.cards.t0.id);
    expect(skipped.teamScores.t0).toBe(0);
  });
});

describe("rounds", () => {
  it("shows a recap between rounds, then rotates the describer", () => {
    let s = start();
    const first = describer(s, "t1");
    s = noTalkAmMode.tick(s, at(s.endsAt));
    expect(s.phase).toBe("between");
    expect(noTalkAmMode.view(s, "ada", ctx).recap).toEqual({ t0: [], t1: [] });
    s = noTalkAmMode.tick(s, at(s.endsAt + BETWEEN_MS));
    expect(s).toMatchObject({ phase: "playing", round: 1 });
    expect(describer(s, "t1")).not.toBe(first);
  });

  it("the host can start the next round early", () => {
    const between = noTalkAmMode.tick(start(), at(ctx.now + 60_000));
    expect(noTalkAmMode.reduce(between, "chidi", { type: "next" }, ctx)).toBe(between);
    expect(noTalkAmMode.reduce(between, "ada", { type: "next" }, ctx).round).toBe(1);
  });

  it("skips a describer who has left the room", () => {
    const s = start();
    const gone = describer(s, "t1");
    const remaining = { ...ctx, players: players.filter((p) => p.id !== gone) };
    const next = describerFor(s, "t1", remaining);
    expect(next).not.toBeNull();
    expect(next).not.toBe(gone);
  });

  it("finishes after the last round", () => {
    let s = start();
    for (let r = 0; r < s.totalRounds; r++) {
      s = noTalkAmMode.tick(s, at(s.endsAt));
      if (s.phase === "between") s = noTalkAmMode.tick(s, at(s.endsAt));
    }
    expect(noTalkAmMode.isFinished(s)).toBe(true);
    expect(noTalkAmMode.nextDeadline(s)).toBeNull();
  });
});

describe("cards", () => {
  it("every sample card has a word, unique id and four banned words", () => {
    const ids = new Set(noTalkAmCards.map((c) => c.id));
    expect(ids.size).toBe(noTalkAmCards.length);
    for (const card of noTalkAmCards) {
      expect(card.word.trim()).not.toBe("");
      expect(card.taboo).toHaveLength(4);
    }
  });
});
