import type { QuizAction, QuizState } from "@/lib/types";
import { POINTS_PER_CORRECT } from "./scoring";

export const initialState: QuizState = {
  screen: "home",
  category: null,
  questions: [],
  currentIndex: 0,
  phase: "answering",
  selectedAnswer: null,
  timedOut: false,
  score: 0,
};

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "GO_HOME":
      return initialState;

    case "GO_TO_CATEGORIES":
      return { ...initialState, screen: "category" };

    case "START_QUIZ":
      return {
        ...initialState,
        screen: "quiz",
        category: action.category,
        questions: action.questions,
      };

    case "ANSWER": {
      // Locks the answer: ignored unless we are waiting for one.
      if (state.screen !== "quiz" || state.phase !== "answering") return state;
      const question = state.questions[state.currentIndex];
      if (!question) return state;
      const isCorrect = action.option === question.answer;
      return {
        ...state,
        phase: "feedback",
        selectedAnswer: action.option,
        score: isCorrect ? state.score + POINTS_PER_CORRECT : state.score,
      };
    }

    case "TIME_UP":
      // Ignored if the player already answered, so a late timer tick can't change anything.
      if (state.screen !== "quiz" || state.phase !== "answering") return state;
      return { ...state, phase: "feedback", selectedAnswer: null, timedOut: true };

    case "NEXT": {
      if (state.screen !== "quiz" || state.phase !== "feedback") return state;
      const isLast = state.currentIndex >= state.questions.length - 1;
      if (isLast) return { ...state, screen: "results" };
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        phase: "answering",
        selectedAnswer: null,
        timedOut: false,
      };
    }

    default:
      return state;
  }
}
