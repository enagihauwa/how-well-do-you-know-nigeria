export type CategoryId =
  | "general-knowledge"
  | "states-and-geography"
  | "food-and-culture"
  | "music-and-entertainment";

export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: string;
  question: string;
  /** Exactly four unique options. */
  options: string[];
  /** Must match one of `options` exactly. */
  answer: string;
  category: CategoryId;
  /** Stored for future use. Does not affect gameplay in the MVP. */
  difficulty: Difficulty;
}

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
  /** Simple visual marker shown on the category card. */
  emoji: string;
}

export type Screen = "home" | "category" | "quiz" | "results";

/** `answering`: the player can pick and change their pick. `feedback`: revealed, showing the result. */
export type Phase = "answering" | "feedback";

export interface QuizState {
  screen: Screen;
  category: CategoryId | null;
  /** The questions for the current game, options already shuffled. */
  questions: Question[];
  currentIndex: number;
  phase: Phase;
  /** The option the player picked (their latest pick), or null if none. */
  selectedAnswer: string | null;
  timedOut: boolean;
  score: number;
}

export type QuizAction =
  | { type: "GO_HOME" }
  | { type: "GO_TO_CATEGORIES" }
  | { type: "START_QUIZ"; category: CategoryId; questions: Question[] }
  /** Pick or change the answer. Nothing is revealed or scored yet. */
  | { type: "ANSWER"; option: string }
  /** The player asks to see the result now. Needs a pick. */
  | { type: "CHECK" }
  /** The timer ran out: reveal, scoring the latest pick if there is one. */
  | { type: "TIME_UP" }
  | { type: "NEXT" };
