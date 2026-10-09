import type { Question } from "@/lib/types";
import { foodAndCultureQuestions } from "./food-and-culture";
import { generalKnowledgeQuestions } from "./general-knowledge";
import { musicAndEntertainmentQuestions } from "./music-and-entertainment";
import { statesAndGeographyQuestions } from "./states-and-geography";

export const allQuestions: Question[] = [
  ...generalKnowledgeQuestions,
  ...statesAndGeographyQuestions,
  ...foodAndCultureQuestions,
  ...musicAndEntertainmentQuestions,
];
