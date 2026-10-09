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

/** `answering`: waiting for a selection. `feedback`: answer locked, showing the result. */
export type Phase = "answering" | "feedback";

export interface QuizState {
  screen: Screen;
  category: CategoryId | null;
  /** The questions for the current game, options already shuffled. */
  questions: Question[];
  currentIndex: number;
  phase: Phase;
  /** The option the player picked, or null if none (including on timeout). */
  selectedAnswer: string | null;
  timedOut: boolean;
  score: number;
}

export type QuizAction =
  | { type: "GO_HOME" }
  | { type: "GO_TO_CATEGORIES" }
  | { type: "START_QUIZ"; category: CategoryId; questions: Question[] }
  | { type: "ANSWER"; option: string }
  | { type: "TIME_UP" }
  | { type: "NEXT" };
