import { shuffle } from "@/lib/quiz/selectQuestions";
import { matchesAnswer } from "./textMatch";
import type { GameMode, ModeContext, PlayerId, TeamId } from "./types";

/**
 * No Talk Am: a Taboo-style game. Each round, every team has one describer who sees a word and
 * the words they must not say. They describe it over team voice (or out loud in Same Room mode)
 * and teammates type guesses. All teams play their rounds at the same time. The describer
 * rotates every round. Avoiding the banned words is on the honour system.
 */

export interface TabooCard {
  id: string;
  word: string;
  /** Other spellings that also count, e.g. "Iyan" for pounded yam. */
  aliases?: string[];
  taboo: string[];
}

export interface NoTalkAmConfig {
  roundSeconds: number;
  /** Null: one round per player on the biggest team, so everyone describes at least once. */
  rounds: number | null;
}

export type NoTalkAmContent = readonly TabooCard[];

export type NoTalkAmAction = { type: "guess"; text: string } | { type: "skip" } | { type: "next" };

export type NoTalkAmPhase = "playing" | "between" | "finished";

interface Won {
  word: string;
  by: PlayerId;
}

export interface NoTalkAmState {
  config: NoTalkAmConfig;
  phase: NoTalkAmPhase;
  round: number;
  totalRounds: number;
  endsAt: number;
  /** Describer rotation per team, fixed at the start. */
  order: Record<TeamId, PlayerId[]>;
  deck: TabooCard[];
  deckPos: number;
  cards: Record<TeamId, TabooCard>;
  /** Words each team got this round. */
  roundWon: Record<TeamId, Won[]>;
  teamScores: Record<TeamId, number>;
  playerScores: Record<PlayerId, number>;
}

export type NoTalkAmRole = "describer" | "guesser" | "spectator";

export interface NoTalkAmView {
  mode: "no-talk-am";
  phase: NoTalkAmPhase;
  round: number;
  totalRounds: number;
  roundSeconds: number;
  endsAt: number;
  role: NoTalkAmRole;
  describerId: PlayerId | null;
  /** Only the describer sees the card. */
  card: { word: string; taboo: string[] } | null;
  /** Words this player's team has got this round. */
  myTeamWon: string[];
  /** Every team's words for the round, shown between rounds and at the end. */
  recap: Record<TeamId, string[]> | null;
  teamScores: Record<TeamId, number>;
  playerScores: Record<PlayerId, number>;
}

export const POINTS_PER_CARD = 10;
/** Pause between rounds before the next starts by itself. */
export const BETWEEN_MS = 12000;

const teamOf = (ctx: ModeContext, playerId: PlayerId) =>
  ctx.players.find((p) => p.id === playerId)?.teamId ?? null;

/** This round's describer: the next player in rotation who is still in the room. */
export function describerFor(state: NoTalkAmState, teamId: TeamId, ctx: ModeContext): PlayerId | null {
  const order = state.order[teamId] ?? [];
  for (let i = 0; i < order.length; i++) {
    const id = order[(state.round + i) % order.length];
    if (ctx.players.some((p) => p.id === id && p.teamId === teamId)) return id;
  }
  return null;
}

function draw(state: NoTalkAmState, ctx: ModeContext): { card: TabooCard; deck: TabooCard[]; deckPos: number } {
  let { deck, deckPos } = state;
  if (deckPos >= deck.length) {
    deck = shuffle(deck, ctx.rng);
    deckPos = 0;
  }
  return { card: deck[deckPos], deck, deckPos: deckPos + 1 };
}

function dealAll(state: NoTalkAmState, ctx: ModeContext): NoTalkAmState {
  let next = { ...state, cards: { ...state.cards } };
  for (const teamId of Object.keys(state.order)) {
    const { card, deck, deckPos } = draw(next, ctx);
    next = { ...next, deck, deckPos, cards: { ...next.cards, [teamId]: card } };
  }
  return next;
}

function startRound(state: NoTalkAmState, round: number, ctx: ModeContext): NoTalkAmState {
  const roundWon = Object.fromEntries(Object.keys(state.order).map((id) => [id, []]));
  return dealAll(
    { ...state, phase: "playing", round, endsAt: ctx.now + state.config.roundSeconds * 1000, roundWon },
    ctx,
  );
}

function endRound(state: NoTalkAmState, ctx: ModeContext): NoTalkAmState {
  if (state.round >= state.totalRounds - 1) return { ...state, phase: "finished", endsAt: 0 };
  return { ...state, phase: "between", endsAt: ctx.now + BETWEEN_MS };
}

function addPoints(scores: Record<string, number>, id: string): Record<string, number> {
  return { ...scores, [id]: (scores[id] ?? 0) + POINTS_PER_CARD };
}

export const noTalkAmMode: GameMode<
  NoTalkAmConfig,
  NoTalkAmContent,
  NoTalkAmState,
  NoTalkAmAction,
  NoTalkAmView
> = {
  id: "no-talk-am",
  defaultConfig: { roundSeconds: 60, rounds: null },

  canStart(_config, content, ctx) {
    if (content.length === 0) return "not_enough_content";
    const counts = ctx.teamIds.map((id) => ctx.players.filter((p) => p.teamId === id).length);
    // A team needs a describer and at least one guesser. Empty teams sit the match out.
    if (counts.some((n) => n === 1) || counts.every((n) => n === 0)) return "need_two_per_team";
    return null;
  },

  start(config, content, ctx) {
    const order: Record<TeamId, PlayerId[]> = {};
    for (const teamId of ctx.teamIds) {
      const members = ctx.players.filter((p) => p.teamId === teamId).map((p) => p.id);
      if (members.length > 0) order[teamId] = shuffle(members, ctx.rng);
    }
    const biggest = Math.max(...Object.values(order).map((m) => m.length));
    const state: NoTalkAmState = {
      config,
      phase: "playing",
      round: 0,
      totalRounds: config.rounds ?? biggest,
      endsAt: 0,
      order,
      deck: shuffle(content, ctx.rng),
      deckPos: 0,
      cards: {},
      roundWon: {},
      teamScores: Object.fromEntries(Object.keys(order).map((id) => [id, 0])),
      playerScores: Object.fromEntries(ctx.players.map((p) => [p.id, 0])),
    };
    return startRound(state, 0, ctx);
  },

  reduce(state, playerId, action, ctx) {
    if (action.type === "next") {
      if (state.phase !== "between" || playerId !== ctx.hostId) return state;
      return startRound(state, state.round + 1, ctx);
    }

    if (state.phase !== "playing" || ctx.now >= state.endsAt) return state;
    const teamId = teamOf(ctx, playerId);
    if (!teamId || !(teamId in state.order)) return state;
    const describer = describerFor(state, teamId, ctx);

    if (action.type === "skip") {
      if (playerId !== describer) return state;
      const { card, deck, deckPos } = draw(state, ctx);
      return { ...state, deck, deckPos, cards: { ...state.cards, [teamId]: card } };
    }

    if (action.type === "guess") {
      if (playerId === describer) return state; // the describer cannot answer their own card
      const current = state.cards[teamId];
      if (!current || !matchesAnswer(action.text, [current.word, ...(current.aliases ?? [])])) {
        return state;
      }
      const { card, deck, deckPos } = draw(state, ctx);
      let playerScores = addPoints(state.playerScores, playerId);
      if (describer) playerScores = addPoints(playerScores, describer);
      return {
        ...state,
        deck,
        deckPos,
        cards: { ...state.cards, [teamId]: card },
        roundWon: {
          ...state.roundWon,
          [teamId]: [...(state.roundWon[teamId] ?? []), { word: current.word, by: playerId }],
        },
        teamScores: addPoints(state.teamScores, teamId),
        playerScores,
      };
    }

    return state;
  },

  tick(state, ctx) {
    if (ctx.now < state.endsAt) return state;
    if (state.phase === "playing") return endRound(state, ctx);
    if (state.phase === "between") return startRound(state, state.round + 1, ctx);
    return state;
  },

  nextDeadline: (state) => (state.phase === "finished" ? null : state.endsAt),

  view(state, playerId, ctx) {
    const teamId = teamOf(ctx, playerId);
    const playing = teamId !== null && teamId in state.order;
    const describerId = playing ? describerFor(state, teamId, ctx) : null;
    const role: NoTalkAmRole = !playing ? "spectator" : describerId === playerId ? "describer" : "guesser";
    const card = role === "describer" && state.phase === "playing" ? state.cards[teamId!] : null;

    return {
      mode: "no-talk-am",
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      roundSeconds: state.config.roundSeconds,
      endsAt: state.endsAt,
      role,
      describerId,
      card: card ? { word: card.word, taboo: card.taboo } : null,
      myTeamWon: playing ? (state.roundWon[teamId!] ?? []).map((w) => w.word) : [],
      recap:
        state.phase === "playing"
          ? null
          : Object.fromEntries(
              Object.entries(state.roundWon).map(([id, won]) => [id, won.map((w) => w.word)]),
            ),
      teamScores: state.teamScores,
      playerScores: state.playerScores,
    };
  },

  // The describer could just type the word, so they cannot chat while a round is on.
  canChat: (state, playerId, ctx) =>
    state.phase !== "playing" || !Object.keys(state.order).some((teamId) => describerFor(state, teamId, ctx) === playerId),

  isFinished: (state) => state.phase === "finished",

  summary: (state) => ({ teamScores: state.teamScores, playerScores: state.playerScores }),
};
