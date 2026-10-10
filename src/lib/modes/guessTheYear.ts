import { createRoundMode } from "./roundMode";

/**
 * Guess the Year: when did this happen in Nigeria? Everyone types a year. Exact scores 20, the
 * closest guess in the room scores 10 (ties share it), within 3 years scores 5.
 */

export interface YearItem {
  id: string;
  prompt: string;
  year: number;
}

export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;

export const guessTheYearMode = createRoundMode({
  id: "guess-the-year",
  rounds: 8,
  answerMs: 15_000,
  revealMs: 7_000,
  publicItem: (item: YearItem) => ({ prompt: item.prompt }),
  isValidAnswer: (answer: unknown): answer is number =>
    Number.isInteger(answer) && (answer as number) >= MIN_YEAR && (answer as number) <= MAX_YEAR,
  solution: (item: YearItem) => item.year,
  score(item: YearItem, answers: Record<string, number>) {
    const distances = Object.values(answers).map((y) => Math.abs(y - item.year));
    const closest = Math.min(...distances);
    return Object.fromEntries(
      Object.entries(answers).map(([playerId, year]) => {
        const off = Math.abs(year - item.year);
        const points = off === 0 ? 20 : off === closest ? 10 : off <= 3 ? 5 : 0;
        return [playerId, points];
      }),
    );
  },
  // Usually close, sometimes spot on, sometimes way off: between 0 and 12 years out, either side.
  botAnswer(item: YearItem, rng) {
    const off = Math.round(rng() ** 2 * 12) * (rng() < 0.5 ? -1 : 1);
    return Math.min(MAX_YEAR, Math.max(MIN_YEAR, item.year + off));
  },
});
