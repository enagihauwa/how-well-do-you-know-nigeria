import type { CategoryId, Question } from "../types";
import { QUESTIONS_PER_GAME } from "./scoring";

export type Rng = () => number;

/** Fisher–Yates shuffle. Returns a new array and leaves the input untouched. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Picks `QUESTIONS_PER_GAME` distinct random questions from the category and
 * shuffles each question's options. Throws if the category has too few questions.
 * Must only be called on the client in response to a user action, never during render.
 */
export function selectQuestions(
  pool: readonly Question[],
  category: CategoryId,
  rng: Rng = Math.random,
): Question[] {
  const inCategory = pool.filter((q) => q.category === category);

  if (inCategory.length < QUESTIONS_PER_GAME) {
    throw new Error(
      `Category "${category}" has ${inCategory.length} questions; at least ${QUESTIONS_PER_GAME} are required.`,
    );
  }

  return shuffle(inCategory, rng)
    .slice(0, QUESTIONS_PER_GAME)
    .map((q) => ({ ...q, options: shuffle(q.options, rng) }));
}
