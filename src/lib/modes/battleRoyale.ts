import { POINTS_PER_CORRECT } from "@/lib/quiz/scoring";
import { shuffle } from "@/lib/quiz/selectQuestions";
import type { Difficulty, Question } from "@/lib/types";
import { botOption } from "./bots";
import type { GameMode, ModeContext, PlayerId, TeamId } from "./types";

/**
 * "Who Go Remain?": trivia battle royale. Everyone answers every question; a wrong or missing
 * answer costs a life; out of lives, you are out and watch. Questions get harder as rounds go on.
 * If every player still in would lose a life on the same question, nobody does (so a hard
 * question cannot end the game with no winner). Last one standing wins.
 *
 * Squads: players are in teams; a squad is in while any member is. Last squad standing wins.
 * Placement (who went out when) is the result that rankings are built on.
 */

export interface BattleRoyaleConfig {
  lives: number;
  squads: boolean;
  /** Most questions a match can take; it usually ends sooner. */
  maxQuestions: number;
}

export type BattleRoyaleContent = readonly Question[];
export type BattleRoyaleAction = { type: "lock"; option: string };
export type BattleRoyalePhase = "question" | "reveal" | "finished";

export const BR_ANSWER_MS = 12_000;
export const BR_REVEAL_MS = 5_000;
const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];
export { BOT_ACCURACY } from "./bots";
/** Bots "think" for this long before locking, like a person reading the options. */
const BOT_THINK_MS = { min: 2000, max: 9000 };

interface Answer {
  option: string;
  /** Milliseconds from the question appearing to the lock: the tiebreak. */
  ms: number;
}

export interface BattleRoyaleState {
  config: BattleRoyaleConfig;
  questions: Question[];
  index: number;
  phase: BattleRoyalePhase;
  startedAt: number;
  endsAt: number;
  /** Fixed at the start: everyone in the match, and their squad. */
  teamOf: Record<PlayerId, TeamId>;
  lives: Record<PlayerId, number>;
  /** Question index a player went out on. */
  outAt: Record<PlayerId, number>;
  answers: Record<PlayerId, Answer>;
  /** Total time of correct answers, lower is better. */
  totalMs: Record<PlayerId, number>;
  correct: Record<PlayerId, number>;
  /** Players who lost a life in the last reveal, and whether the mercy rule saved everyone. */
  lastHit: PlayerId[];
  lastMercy: boolean;
}

export interface BattleRoyaleView {
  mode: "battle-royale";
  squads: boolean;
  phase: BattleRoyalePhase;
  index: number;
  endsAt: number;
  answerMs: number;
  question: { id: string; text: string; options: string[]; difficulty: Difficulty } | null;
  answer: string | null;
  myAnswer: string | null;
  myLives: number;
  maxLives: number;
  amIn: boolean;
  playersIn: number;
  playersTotal: number;
  squadsIn: number;
  /** During a reveal: how many picked each option (everyone sees it; it is fun to see). */
  optionCounts: Record<string, number>;
  /** During a reveal: who lost a life, and who went out. */
  hit: PlayerId[];
  wentOut: PlayerId[];
  mercy: boolean;
  /** Best first. Filled in when finished. */
  placements: PlayerId[];
  myPlace: number | null;
  /** Players in the room per squad, with whether each is still in. */
  mySquad: { id: PlayerId; in: boolean; lives: number }[];
}

const isIn = (s: BattleRoyaleState, id: PlayerId) => (s.lives[id] ?? 0) > 0;
const playersIn = (s: BattleRoyaleState) => Object.keys(s.lives).filter((id) => isIn(s, id));
const squadsIn = (s: BattleRoyaleState) => new Set(playersIn(s).map((id) => s.teamOf[id])).size;

/** Easy first, then medium, then hard; shuffled within each band. */
function dealQuestions(content: readonly Question[], max: number, rng: () => number): Question[] {
  return DIFFICULTY_ORDER.flatMap((d) => shuffle(content.filter((q) => q.difficulty === d), rng))
    .slice(0, max)
    .map((q) => ({ ...q, options: shuffle(q.options, rng) }));
}

/** Best first: still in (more lives, then faster), then by how late they went out. */
export function placements(s: BattleRoyaleState): PlayerId[] {
  return Object.keys(s.lives).sort((a, b) => {
    const outA = s.outAt[a] ?? Infinity;
    const outB = s.outAt[b] ?? Infinity;
    if (outA !== outB) return outB - outA;
    if (s.lives[a] !== s.lives[b]) return s.lives[b] - s.lives[a];
    if (s.correct[a] !== s.correct[b]) return s.correct[b] - s.correct[a];
    return s.totalMs[a] - s.totalMs[b];
  });
}

function isOver(s: BattleRoyaleState): boolean {
  const left = s.config.squads ? squadsIn(s) : playersIn(s).length;
  return left <= 1 || s.index >= s.questions.length - 1;
}

function reveal(s: BattleRoyaleState, ctx: ModeContext): BattleRoyaleState {
  const q = s.questions[s.index];
  const alive = playersIn(s);
  const wrong = alive.filter((id) => s.answers[id]?.option !== q.answer);
  const mercy = wrong.length === alive.length && alive.length > 0;
  const lives = { ...s.lives };
  const outAt = { ...s.outAt };
  const totalMs = { ...s.totalMs };
  const correct = { ...s.correct };
  for (const id of alive) {
    const a = s.answers[id];
    if (a?.option === q.answer) {
      totalMs[id] += a.ms;
      correct[id] += 1;
    }
  }
  if (!mercy) {
    for (const id of wrong) {
      lives[id] -= 1;
      if (lives[id] === 0) outAt[id] = s.index;
    }
  }
  return {
    ...s,
    phase: "reveal",
    endsAt: ctx.now + BR_REVEAL_MS,
    lives,
    outAt,
    totalMs,
    correct,
    lastHit: mercy ? [] : wrong,
    lastMercy: mercy,
  };
}

function advance(s: BattleRoyaleState, ctx: ModeContext): BattleRoyaleState {
  if (isOver(s)) return { ...s, phase: "finished", endsAt: 0 };
  return {
    ...s,
    index: s.index + 1,
    phase: "question",
    startedAt: ctx.now,
    endsAt: ctx.now + BR_ANSWER_MS,
    answers: {},
    lastHit: [],
    lastMercy: false,
  };
}

/** Everyone still in who is connected has answered. Disconnected players simply miss out. */
function allAnswered(s: BattleRoyaleState, ctx: ModeContext): boolean {
  const connectedIn = ctx.players.filter((p) => isIn(s, p.id));
  return connectedIn.length > 0 && connectedIn.every((p) => p.id in s.answers);
}

export const battleRoyaleMode: GameMode<
  BattleRoyaleConfig,
  BattleRoyaleContent,
  BattleRoyaleState,
  BattleRoyaleAction,
  BattleRoyaleView
> = {
  id: "battle-royale",
  defaultConfig: { lives: 2, squads: false, maxQuestions: 30 },

  canStart: (config, content) => (content.length >= 5 ? null : "not_enough_content"),

  start(config, content, ctx) {
    const ids = ctx.players.map((p) => p.id);
    const zero = () => Object.fromEntries(ids.map((id) => [id, 0]));
    return {
      config,
      questions: dealQuestions(content, config.maxQuestions, ctx.rng),
      index: 0,
      phase: "question",
      startedAt: ctx.now,
      endsAt: ctx.now + BR_ANSWER_MS,
      teamOf: Object.fromEntries(ctx.players.map((p) => [p.id, config.squads ? p.teamId : p.id])),
      lives: Object.fromEntries(ids.map((id) => [id, config.lives])),
      outAt: {},
      answers: {},
      totalMs: zero(),
      correct: zero(),
      lastHit: [],
      lastMercy: false,
    };
  },

  reduce(s, playerId, action, ctx) {
    if (action.type !== "lock" || s.phase !== "question" || ctx.now >= s.endsAt) return s;
    // A pick can change until the reveal; the time of the latest pick is the tiebreak.
    if (!isIn(s, playerId) || s.answers[playerId]?.option === action.option) return s;
    if (!s.questions[s.index].options.includes(action.option)) return s;
    const next = { ...s, answers: { ...s.answers, [playerId]: { option: action.option, ms: ctx.now - s.startedAt } } };
    return allAnswered(next, ctx) ? reveal(next, ctx) : next;
  },

  tick(s, ctx) {
    if (s.phase === "question" && (ctx.now >= s.endsAt || allAnswered(s, ctx))) return reveal(s, ctx);
    if (s.phase === "reveal" && ctx.now >= s.endsAt) return advance(s, ctx);
    return s;
  },

  nextDeadline: (s) => (s.phase === "finished" ? null : s.endsAt),

  view(s, playerId) {
    const q = s.questions[s.index];
    const revealing = s.phase === "reveal";
    const order = s.phase === "finished" ? placements(s) : [];
    const optionCounts: Record<string, number> = {};
    if (revealing) {
      for (const o of q.options) optionCounts[o] = 0;
      for (const a of Object.values(s.answers)) optionCounts[a.option] += 1;
    }
    const squad = s.teamOf[playerId];
    return {
      mode: "battle-royale",
      squads: s.config.squads,
      phase: s.phase,
      index: s.index,
      endsAt: s.endsAt,
      answerMs: BR_ANSWER_MS,
      question: s.phase === "finished" ? null : { id: q.id, text: q.question, options: q.options, difficulty: q.difficulty },
      answer: s.phase === "question" ? null : q.answer,
      myAnswer: s.answers[playerId]?.option ?? null,
      myLives: s.lives[playerId] ?? 0,
      maxLives: s.config.lives,
      amIn: isIn(s, playerId),
      playersIn: playersIn(s).length,
      playersTotal: Object.keys(s.lives).length,
      squadsIn: squadsIn(s),
      optionCounts,
      hit: revealing ? s.lastHit : [],
      wentOut: revealing ? s.lastHit.filter((id) => s.outAt[id] === s.index) : [],
      mercy: revealing && s.lastMercy,
      placements: order,
      myPlace: order.length ? order.indexOf(playerId) + 1 : null,
      mySquad: s.config.squads
        ? Object.keys(s.teamOf)
            .filter((id) => s.teamOf[id] === squad)
            .map((id) => ({ id, in: isIn(s, id), lives: s.lives[id] }))
        : [],
    };
  },

  botTurn: (s) => (s.phase === "question" ? String(s.index) : null),

  botAction(s, botId, ctx) {
    if (s.phase !== "question" || !isIn(s, botId) || botId in s.answers) return null;
    const option = botOption(s.questions[s.index], ctx.rng);
    const afterMs = BOT_THINK_MS.min + ctx.rng() * (BOT_THINK_MS.max - BOT_THINK_MS.min);
    return { action: { type: "lock", option }, afterMs: Math.round(afterMs) };
  },

  isFinished: (s) => s.phase === "finished",

  summary(s) {
    const order = placements(s);
    // Points for the room's scoreboard: correct answers; placement is the real result.
    const playerScores = Object.fromEntries(Object.keys(s.lives).map((id) => [id, s.correct[id] * POINTS_PER_CORRECT]));
    const teamScores: Record<TeamId, number> = {};
    for (const [id, team] of Object.entries(s.teamOf)) teamScores[team] = (teamScores[team] ?? 0) + playerScores[id];
    return { teamScores, playerScores, placements: order };
  },
};
