import type { Difficulty, Question } from "../types";

/**
 * How bots play, shared by every mode that opts in with `botTurn`/`botAction`. Bots are meant to
 * be beatable company for a small room, not perfect: they miss sometimes and take a moment.
 */

/** Bot seats have ids `bot-0`, `bot-1`…; real players' ids never start with "bot-". */
export const isBotId = (id: string) => id.startsWith("bot-");

/** Chance a bot gets a multiple-choice question right, by difficulty. */
export const BOT_ACCURACY: Record<Difficulty, number> = { easy: 0.8, medium: 0.6, hard: 0.4 };

/** A bot's pick for a multiple-choice question: right with `BOT_ACCURACY`, else a random wrong option. */
export function botOption(q: Question, rng: () => number): string {
  if (rng() < BOT_ACCURACY[q.difficulty]) return q.answer;
  const wrong = q.options.filter((o) => o !== q.answer);
  return wrong[Math.floor(rng() * wrong.length)];
}

/** How long a bot "thinks" before answering: 20–90% of the time allowed, so it never times out. */
export const botThinkMs = (rng: () => number, windowMs: number) => Math.round(windowMs * (0.2 + 0.7 * rng()));
