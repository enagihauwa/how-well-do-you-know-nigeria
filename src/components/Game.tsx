"use client";

import { useReducer } from "react";
import { allQuestions } from "@/data/questions";
import { initialState, quizReducer } from "@/lib/quiz/quizReducer";
import { selectQuestions } from "@/lib/quiz/selectQuestions";
import type { CategoryId } from "@/lib/types";
import { CategoryScreen } from "@/components/screens/CategoryScreen";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { QuizScreen } from "@/components/screens/QuizScreen";
import { ResultsScreen } from "@/components/screens/ResultsScreen";

export function Game() {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  // Random selection and shuffling happen here, in response to a click, never during render.
  const startQuiz = (category: CategoryId) =>
    dispatch({
      type: "START_QUIZ",
      category,
      questions: selectQuestions(allQuestions, category),
    });

  switch (state.screen) {
    case "home":
      return <HomeScreen onPlay={() => dispatch({ type: "GO_TO_CATEGORIES" })} />;
    case "category":
      return (
        <CategoryScreen
          onBack={() => dispatch({ type: "GO_HOME" })}
          onSelect={startQuiz}
        />
      );
    case "quiz":
      return (
        <QuizScreen
          state={state}
          onBack={() => dispatch({ type: "GO_TO_CATEGORIES" })}
          onAnswer={(option) => dispatch({ type: "ANSWER", option })}
          onCheck={() => dispatch({ type: "CHECK" })}
          onTimeUp={() => dispatch({ type: "TIME_UP" })}
          onNext={() => dispatch({ type: "NEXT" })}
        />
      );
    case "results":
      return (
        <ResultsScreen
          score={state.score}
          category={state.category}
          // Same path as choosing a category: a fresh random selection and a reset game.
          onPlayAgain={() => state.category && startQuiz(state.category)}
          onChooseCategory={() => dispatch({ type: "GO_TO_CATEGORIES" })}
        />
      );
    default:
      return null;
  }
}
