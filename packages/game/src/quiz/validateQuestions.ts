import type { CategoryId, Difficulty, Question } from "../types";
import { OPTIONS_PER_QUESTION, QUESTIONS_PER_GAME } from "./scoring";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/** Returns a list of human-readable data errors. An empty list means the data is valid. */
export function validateQuestions(
  questions: Question[],
  categoryIds: CategoryId[],
): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const q of questions) {
    const label = `Question "${q.id}"`;

    if (seenIds.has(q.id)) errors.push(`${label}: duplicate id`);
    seenIds.add(q.id);

    if (!q.question.trim()) errors.push(`${label}: empty question text`);

    if (q.options.length !== OPTIONS_PER_QUESTION) {
      errors.push(`${label}: must have exactly ${OPTIONS_PER_QUESTION} options`);
    }
    if (new Set(q.options).size !== q.options.length) {
      errors.push(`${label}: options must be unique`);
    }
    if (q.options.some((o) => !o.trim())) {
      errors.push(`${label}: options must not be empty`);
    }
    if (!q.options.includes(q.answer)) {
      errors.push(`${label}: answer "${q.answer}" is not one of the options`);
    }
    if (!categoryIds.includes(q.category)) {
      errors.push(`${label}: unknown category "${q.category}"`);
    }
    if (!DIFFICULTIES.includes(q.difficulty)) {
      errors.push(`${label}: invalid difficulty "${q.difficulty}"`);
    }
  }

  for (const id of categoryIds) {
    const count = questions.filter((q) => q.category === id).length;
    if (count < QUESTIONS_PER_GAME) {
      errors.push(
        `Category "${id}" has ${count} questions; at least ${QUESTIONS_PER_GAME} are required`,
      );
    }
  }

  return errors;
}
