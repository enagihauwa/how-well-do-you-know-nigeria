export const QUESTIONS_PER_GAME = 10;
export const OPTIONS_PER_QUESTION = 4;
export const SECONDS_PER_QUESTION = 10;
export const POINTS_PER_CORRECT = 10;
export const MAX_SCORE = QUESTIONS_PER_GAME * POINTS_PER_CORRECT;

export function getCorrectCount(score: number): number {
  return score / POINTS_PER_CORRECT;
}

export function getResultMessage(score: number): string {
  if (score >= 90) return "Nigeria Expert! 🏆";
  if (score >= 70) return "Great Job! 🔥";
  if (score >= 50) return "Not Bad! 👍";
  return "Keep Learning! 📚";
}
