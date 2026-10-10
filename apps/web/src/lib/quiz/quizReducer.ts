import type { QuizAction, QuizState } from "@naija/game/types";
import { POINTS_PER_CORRECT } from "@naija/game/quiz/scoring";

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

/** Shows the result and scores the latest pick. No pick when time ran out counts as a timeout. */
function reveal(state: QuizState): QuizState {
  const question = state.questions[state.currentIndex];
  const isCorrect = question !== undefined && state.selectedAnswer === question.answer;
  return {
    ...state,
    phase: "feedback",
    timedOut: state.selectedAnswer === null,
    score: isCorrect ? state.score + POINTS_PER_CORRECT : state.score,
  };
}

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
      // A pick can change freely until the reveal.
      if (state.screen !== "quiz" || state.phase !== "answering") return state;
      const question = state.questions[state.currentIndex];
      if (!question || !question.options.includes(action.option) || action.option === state.selectedAnswer) return state;
      return { ...state, selectedAnswer: action.option };
    }

    case "CHECK":
      if (state.screen !== "quiz" || state.phase !== "answering" || state.selectedAnswer === null) return state;
      return reveal(state);

    case "TIME_UP":
      // Ignored once revealed, so a late timer tick can't change anything.
      if (state.screen !== "quiz" || state.phase !== "answering") return state;
      return reveal(state);

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
