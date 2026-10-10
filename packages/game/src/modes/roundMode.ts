import { shuffle } from "../quiz/selectQuestions";
import { botThinkMs } from "./bots";
import { bumpStat, type StatsTable } from "./stats";
import type { GameMode, ModeContext, ModeId, PlayerId, TeamId } from "./types";

/**
 * A builder for the common shape of mini game: every player answers the same item before a
 * deadline, the room reveals the solution and everyone's points, then moves on. A new mode only
 * says how to deal items, what a valid answer is, and how to score; timing, secrets, reveal,
 * host skip, auto-advance and team totals come from here. Team score is the sum of its players.
 */

export interface RoundModeSpec<Item, Public, Answer, Solution> {
  id: ModeId;
  rounds: number;
  answerMs: number;
  revealMs: number;
  /** What every phone sees while answering. Must not contain the solution. */
  publicItem(item: Item): Public;
  /** Rebuilds each dealt item, e.g. to shuffle the order its options are shown in. */
  prepare?(item: Item, rng: () => number): Item;
  isValidAnswer(answer: unknown, item: Item): answer is Answer;
  solution(item: Item): Solution;
  /** Points for each player who answered. Players missing from the result get 0. */
  score(item: Item, answers: Record<PlayerId, Answer>): Record<PlayerId, number>;
  /** Optional: what a bot answers. A mode with this can be played with bots. */
  botAnswer?(item: Item, rng: () => number): Answer;
  /** Optional: a flawless answer (an exact year, a perfect sort), counted in that stat. */
  perfect?: { stat: "exact" | "perfectSorts"; test(item: Item, answer: Answer): boolean };
}

export interface RoundModeConfig {
  rounds: number;
}

export type RoundModeAction<Answer> = { type: "answer"; answer: Answer } | { type: "next" };

export type RoundPhase = "answering" | "reveal" | "finished";

export interface RoundModeState<Item, Answer> {
  items: Item[];
  index: number;
  phase: RoundPhase;
  endsAt: number;
  answers: Record<PlayerId, Answer>;
  /** Team at the moment the player answered, so scores land on the right team. */
  answerTeams: Record<PlayerId, TeamId>;
  lastPoints: Record<PlayerId, number>;
  teamScores: Record<TeamId, number>;
  playerScores: Record<PlayerId, number>;
  stats: StatsTable;
}

export interface RoundResult<Answer> {
  playerId: PlayerId;
  teamId: TeamId;
  answer: Answer | null;
  points: number;
}

export interface RoundModeView<Id extends ModeId, Public, Answer, Solution> {
  mode: Id;
  phase: RoundPhase;
  index: number;
  total: number;
  answerMs: number;
  endsAt: number;
  item: Public | null;
  myAnswer: Answer | null;
  answeredCount: number;
  expectedCount: number;
  /** Only during the reveal. */
  solution: Solution | null;
  results: RoundResult<Answer>[];
  teamScores: Record<TeamId, number>;
  playerScores: Record<PlayerId, number>;
}

export function createRoundMode<Id extends ModeId, Item, Public, Answer, Solution>(
  spec: RoundModeSpec<Item, Public, Answer, Solution> & { id: Id },
): GameMode<
  RoundModeConfig,
  readonly Item[],
  RoundModeState<Item, Answer>,
  RoundModeAction<Answer>,
  RoundModeView<Id, Public, Answer, Solution>
> {
  type State = RoundModeState<Item, Answer>;

  const allAnswered = (state: State, ctx: ModeContext) =>
    ctx.players.length > 0 && ctx.players.every((p) => p.id in state.answers);

  const reveal = (state: State, ctx: ModeContext): State => {
    const item = state.items[state.index];
    const points = spec.score(item, state.answers);
    const teamScores = { ...state.teamScores };
    const playerScores = { ...state.playerScores };
    let stats = state.stats;
    for (const [playerId, answer] of Object.entries(state.answers)) {
      stats = bumpStat(stats, playerId, "answered");
      if (points[playerId]) stats = bumpStat(stats, playerId, "correct");
      if (spec.perfect?.test(item, answer)) stats = bumpStat(stats, playerId, spec.perfect.stat);
    }
    for (const [playerId, pts] of Object.entries(points)) {
      const teamId = state.answerTeams[playerId];
      if (!pts || !teamId) continue;
      playerScores[playerId] = (playerScores[playerId] ?? 0) + pts;
      teamScores[teamId] = (teamScores[teamId] ?? 0) + pts;
    }
    return { ...state, phase: "reveal", endsAt: ctx.now + spec.revealMs, lastPoints: points, teamScores, playerScores, stats };
  };

  const advance = (state: State, ctx: ModeContext): State => {
    if (state.index >= state.items.length - 1) return { ...state, phase: "finished", endsAt: 0 };
    return {
      ...state,
      index: state.index + 1,
      phase: "answering",
      endsAt: ctx.now + spec.answerMs,
      answers: {},
      answerTeams: {},
      lastPoints: {},
    };
  };

  return {
    id: spec.id,
    defaultConfig: { rounds: spec.rounds },

    canStart: (_config, content) => (content.length > 0 ? null : "not_enough_content"),

    start(config, content, ctx) {
      const items = shuffle(content, ctx.rng)
        .slice(0, config.rounds)
        .map((item) => (spec.prepare ? spec.prepare(item, ctx.rng) : item));
      return {
        items,
        index: 0,
        phase: "answering",
        endsAt: ctx.now + spec.answerMs,
        answers: {},
        answerTeams: {},
        lastPoints: {},
        teamScores: Object.fromEntries(ctx.teamIds.map((id) => [id, 0])),
        playerScores: Object.fromEntries(ctx.players.map((p) => [p.id, 0])),
        stats: {},
      };
    },

    reduce(state, playerId, action, ctx) {
      if (action.type === "next") {
        if (state.phase !== "reveal" || playerId !== ctx.hostId) return state;
        return advance(state, ctx);
      }
      if (action.type !== "answer" || state.phase !== "answering" || ctx.now >= state.endsAt) return state;
      const teamId = ctx.players.find((p) => p.id === playerId)?.teamId;
      if (!teamId || playerId in state.answers) return state; // one answer each, no changes
      if (!spec.isValidAnswer(action.answer, state.items[state.index])) return state;
      const next: State = {
        ...state,
        answers: { ...state.answers, [playerId]: action.answer },
        answerTeams: { ...state.answerTeams, [playerId]: teamId },
      };
      return allAnswered(next, ctx) ? reveal(next, ctx) : next;
    },

    tick(state, ctx) {
      if (state.phase === "answering" && (ctx.now >= state.endsAt || allAnswered(state, ctx))) {
        return reveal(state, ctx);
      }
      if (state.phase === "reveal" && ctx.now >= state.endsAt) return advance(state, ctx);
      return state;
    },

    nextDeadline: (state) => (state.phase === "finished" ? null : state.endsAt),

    view(state, playerId, ctx) {
      const item = state.items[state.index];
      const revealing = state.phase === "reveal";
      return {
        mode: spec.id,
        phase: state.phase,
        index: state.index,
        total: state.items.length,
        answerMs: spec.answerMs,
        endsAt: state.endsAt,
        item: state.phase === "finished" ? null : spec.publicItem(item),
        myAnswer: state.answers[playerId] ?? null,
        answeredCount: Object.keys(state.answers).length,
        expectedCount: ctx.players.length,
        solution: revealing ? spec.solution(item) : null,
        results: revealing
          ? ctx.players.map((p) => ({
              playerId: p.id,
              teamId: p.teamId,
              answer: state.answers[p.id] ?? null,
              points: state.lastPoints[p.id] ?? 0,
            }))
          : [],
        teamScores: state.teamScores,
        playerScores: state.playerScores,
      };
    },

    ...(spec.botAnswer && {
      botTurn: (state: State) => (state.phase === "answering" ? String(state.index) : null),
      botAction(state: State, botId: PlayerId, ctx: ModeContext) {
        if (state.phase !== "answering" || botId in state.answers) return null;
        const answer = spec.botAnswer!(state.items[state.index], ctx.rng);
        return { action: { type: "answer" as const, answer }, afterMs: botThinkMs(ctx.rng, spec.answerMs) };
      },
    }),

    isFinished: (state) => state.phase === "finished",

    summary: (state) => ({ teamScores: state.teamScores, playerScores: state.playerScores, stats: state.stats }),
  };
}
