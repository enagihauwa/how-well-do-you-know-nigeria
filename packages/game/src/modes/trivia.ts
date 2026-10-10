import { POINTS_PER_CORRECT, QUESTIONS_PER_GAME, SECONDS_PER_QUESTION } from "../quiz/scoring";
import { selectQuestions } from "../quiz/selectQuestions";
import type { CategoryId, Question } from "../types";
import { botOption, botThinkMs, isBotId } from "./bots";
import { questionsInCategory } from "./contentIndex";
import { bumpStat, type StatsTable } from "./stats";
import type { GameMode, ModeContext, PlayerId, TeamId } from "./types";

/**
 * Team trivia. Same rules as solo (10 questions, 4 options, 10 points or 0, 10 seconds), played
 * by teams. `team_lock`: the team has one pick, which any teammate can set or change. `individual`:
 * every player picks and the team score is the sum. Picks can change until the reveal, which comes
 * when time runs out or as soon as every team (or player) has a pick.
 */

export type AnswerRule = "team_lock" | "individual";

export interface TriviaConfig {
  category: CategoryId;
  answerRule: AnswerRule;
}

export type TriviaContent = readonly Question[];

export type TriviaAction = { type: "lock"; option: string } | { type: "next" };

export type TriviaPhase = "question" | "reveal" | "finished";

interface Lock {
  option: string;
  by: PlayerId;
  teamId: TeamId;
}

export interface TriviaState {
  config: TriviaConfig;
  /** Options already shuffled. The answers never leave the server except through `view`. */
  questions: Question[];
  index: number;
  phase: TriviaPhase;
  /** End of the question, or when the reveal auto-advances. 0 when finished. */
  endsAt: number;
  /** `individual`: one lock per player. */
  playerLocks: Record<PlayerId, Lock>;
  /** `team_lock`: one lock per team. */
  teamLocks: Record<TeamId, Lock>;
  teamScores: Record<TeamId, number>;
  playerScores: Record<PlayerId, number>;
  stats: StatsTable;
}

export interface TriviaReveal {
  teamId: TeamId;
  /** The player who locked, or null if the team (or player) ran out of time. */
  playerId: PlayerId | null;
  option: string | null;
  correct: boolean;
}

export interface TriviaView {
  mode: "trivia";
  answerRule: AnswerRule;
  category: CategoryId;
  phase: TriviaPhase;
  index: number;
  total: number;
  endsAt: number;
  question: { id: string; text: string; options: string[] } | null;
  /** Only during the reveal and after. */
  answer: string | null;
  /** This player's lock (`individual`) or their team's lock (`team_lock`). */
  myLock: string | null;
  /** `team_lock`: which teammate locked for the team. */
  myLockBy: PlayerId | null;
  lockedCount: number;
  expectedCount: number;
  /** Everyone's answers, only during the reveal. */
  reveals: TriviaReveal[];
  teamScores: Record<TeamId, number>;
  playerScores: Record<PlayerId, number>;
}

export const QUESTION_MS = SECONDS_PER_QUESTION * 1000;
/** If the host does not tap Next, the reveal moves on by itself after this long. */
export const REVEAL_MS = 8000;

const teamOf = (ctx: ModeContext, playerId: PlayerId) =>
  ctx.players.find((p) => p.id === playerId)?.teamId ?? null;

/** Teams with someone in the room (`team_lock`) or players in the room (`individual`). */
function expected(state: TriviaState, ctx: ModeContext): string[] {
  if (state.config.answerRule === "team_lock") {
    return [...new Set(ctx.players.map((p) => p.teamId))];
  }
  return ctx.players.map((p) => p.id);
}

function locked(state: TriviaState): Record<string, Lock> {
  return state.config.answerRule === "team_lock" ? state.teamLocks : state.playerLocks;
}

function allLocked(state: TriviaState, ctx: ModeContext): boolean {
  const units = expected(state, ctx);
  const locks = locked(state);
  return units.length > 0 && units.every((id) => id in locks);
}

function reveal(state: TriviaState, ctx: ModeContext): TriviaState {
  const answer = state.questions[state.index].answer;
  const teamScores = { ...state.teamScores };
  const playerScores = { ...state.playerScores };
  let stats = state.stats;
  for (const lock of Object.values(locked(state))) {
    // With team lock, the teammate who locked the pick gets the credit for it.
    stats = bumpStat(stats, lock.by, "answered");
    if (lock.option !== answer) continue;
    stats = bumpStat(stats, lock.by, "correct");
    teamScores[lock.teamId] = (teamScores[lock.teamId] ?? 0) + POINTS_PER_CORRECT;
    playerScores[lock.by] = (playerScores[lock.by] ?? 0) + POINTS_PER_CORRECT;
  }
  return { ...state, phase: "reveal", endsAt: ctx.now + REVEAL_MS, teamScores, playerScores, stats };
}

function advance(state: TriviaState, ctx: ModeContext): TriviaState {
  if (state.index >= state.questions.length - 1) {
    return { ...state, phase: "finished", endsAt: 0 };
  }
  return {
    ...state,
    index: state.index + 1,
    phase: "question",
    endsAt: ctx.now + QUESTION_MS,
    playerLocks: {},
    teamLocks: {},
  };
}

export const triviaMode: GameMode<TriviaConfig, TriviaContent, TriviaState, TriviaAction, TriviaView> = {
  id: "trivia",
  defaultConfig: { category: "general-knowledge", answerRule: "team_lock" },

  // Called for every lobby view, so it only counts (from a cached index), never shuffles.
  canStart: (config, content) =>
    questionsInCategory(content, config.category).length >= QUESTIONS_PER_GAME ? null : "not_enough_content",

  start(config, content, ctx) {
    return {
      config,
      questions: selectQuestions(questionsInCategory(content, config.category), config.category, ctx.rng),
      index: 0,
      phase: "question",
      endsAt: ctx.now + QUESTION_MS,
      playerLocks: {},
      teamLocks: {},
      teamScores: Object.fromEntries(ctx.teamIds.map((id) => [id, 0])),
      playerScores: Object.fromEntries(ctx.players.map((p) => [p.id, 0])),
      stats: {},
    };
  },

  reduce(state, playerId, action, ctx) {
    switch (action.type) {
      case "lock": {
        if (state.phase !== "question" || ctx.now >= state.endsAt) return state;
        const teamId = teamOf(ctx, playerId);
        if (!teamId || !state.questions[state.index].options.includes(action.option)) return state;
        const lock: Lock = { option: action.option, by: playerId, teamId };
        let next: TriviaState;
        if (state.config.answerRule === "team_lock") {
          const current = state.teamLocks[teamId];
          if (current?.option === action.option && current.by === playerId) return state;
          next = { ...state, teamLocks: { ...state.teamLocks, [teamId]: lock } };
        } else {
          if (state.playerLocks[playerId]?.option === action.option) return state;
          next = { ...state, playerLocks: { ...state.playerLocks, [playerId]: lock } };
        }
        return allLocked(next, ctx) ? reveal(next, ctx) : next;
      }
      case "next":
        if (state.phase !== "reveal" || playerId !== ctx.hostId) return state;
        return advance(state, ctx);
      default:
        return state;
    }
  },

  tick(state, ctx) {
    if (state.phase === "question" && (ctx.now >= state.endsAt || allLocked(state, ctx))) {
      return reveal(state, ctx);
    }
    if (state.phase === "reveal" && ctx.now >= state.endsAt) return advance(state, ctx);
    return state;
  },

  nextDeadline: (state) => (state.phase === "finished" ? null : state.endsAt),

  view(state, playerId, ctx) {
    const q = state.questions[state.index];
    const showAnswer = state.phase !== "question";
    const teamId = teamOf(ctx, playerId);
    const mine =
      state.config.answerRule === "team_lock"
        ? teamId
          ? state.teamLocks[teamId]
          : undefined
        : state.playerLocks[playerId];

    let reveals: TriviaReveal[] = [];
    if (state.phase === "reveal") {
      const locks = locked(state);
      reveals =
        state.config.answerRule === "team_lock"
          ? ctx.teamIds.map((id) => {
              const lock = locks[id];
              return {
                teamId: id,
                playerId: lock?.by ?? null,
                option: lock?.option ?? null,
                correct: lock?.option === q.answer,
              };
            })
          : ctx.players.map((p) => {
              const lock = locks[p.id];
              return {
                teamId: p.teamId,
                playerId: p.id,
                option: lock?.option ?? null,
                correct: lock?.option === q.answer,
              };
            });
    }

    return {
      mode: "trivia",
      answerRule: state.config.answerRule,
      category: state.config.category,
      phase: state.phase,
      index: state.index,
      total: state.questions.length,
      endsAt: state.endsAt,
      question:
        state.phase === "finished" ? null : { id: q.id, text: q.question, options: q.options },
      answer: showAnswer ? q.answer : null,
      myLock: mine?.option ?? null,
      myLockBy: mine?.by ?? null,
      lockedCount: Object.keys(locked(state)).length,
      expectedCount: expected(state, ctx).length,
      reveals,
      teamScores: state.teamScores,
      playerScores: state.playerScores,
    };
  },

  botTurn: (state) => (state.phase === "question" ? String(state.index) : null),

  botAction(state, botId, ctx) {
    if (state.phase !== "question") return null;
    if (state.config.answerRule === "team_lock") {
      // A bot's move is planned at the start of the question, so on a team with people it could
      // overwrite their pick. Bots answer for all-bot teams only, one bot per team.
      const teamId = teamOf(ctx, botId);
      const team = ctx.players.filter((p) => p.teamId === teamId);
      if (!teamId || team[0]?.id !== botId || team.some((p) => !isBotId(p.id)) || teamId in state.teamLocks) return null;
    } else if (botId in state.playerLocks) {
      return null;
    }
    const option = botOption(state.questions[state.index], ctx.rng);
    return { action: { type: "lock", option }, afterMs: botThinkMs(ctx.rng, QUESTION_MS) };
  },

  isFinished: (state) => state.phase === "finished",

  summary: (state) => ({ teamScores: state.teamScores, playerScores: state.playerScores, stats: state.stats }),
};
