import { shuffle } from "../quiz/selectQuestions";
import { createRoundMode } from "./roundMode";

/**
 * Sort Am: put four things in the right order (oldest first, north to south…). Players tap the
 * items in order. 5 points for each item in its correct place, so a perfect sort scores 20.
 */

export interface SortItem {
  id: string;
  prompt: string;
  /** In the correct order. */
  order: string[];
  /** Set when dealt: the order the phone shows them in. */
  shown?: string[];
}

export const POINTS_PER_PLACE = 5;

export const sortAmMode = createRoundMode({
  id: "sort-am",
  rounds: 5,
  answerMs: 25_000,
  revealMs: 7_000,
  prepare: (item: SortItem, rng) => {
    let shown = shuffle(item.order, rng);
    // Never deal the answer already sorted.
    if (shown.every((v, i) => v === item.order[i])) shown = [...shown.slice(1), shown[0]];
    return { ...item, shown };
  },
  publicItem: (item: SortItem) => ({ prompt: item.prompt, options: item.shown ?? item.order }),
  isValidAnswer: (answer: unknown, item: SortItem): answer is string[] =>
    Array.isArray(answer) &&
    answer.length === item.order.length &&
    new Set(answer).size === answer.length &&
    answer.every((v) => item.order.includes(v)),
  solution: (item: SortItem) => item.order,
  score: (item: SortItem, answers: Record<string, string[]>) =>
    Object.fromEntries(
      Object.entries(answers).map(([playerId, answer]) => [
        playerId,
        answer.filter((v, i) => v === item.order[i]).length * POINTS_PER_PLACE,
      ]),
    ),
  perfect: { stat: "perfectSorts", test: (item: SortItem, answer: string[]) => answer.every((v, i) => v === item.order[i]) },
  // The right order with 0–2 neighbouring items swapped: often perfect, often one or two out.
  botAnswer(item: SortItem, rng) {
    const answer = [...item.order];
    const swaps = Math.floor(rng() * 3);
    for (let s = 0; s < swaps; s++) {
      const i = Math.floor(rng() * (answer.length - 1));
      [answer[i], answer[i + 1]] = [answer[i + 1], answer[i]];
    }
    return answer;
  },
});
