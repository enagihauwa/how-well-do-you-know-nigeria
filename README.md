# How Well Do You Know Nigeria?

A fun, replayable multiple-choice trivia game that tests your knowledge of Nigeria. Pick a category, answer 10 timed questions, and see how well you score.

> **Status:** MVP in development. The game is fully playable, but the question bank is sample data (see [Current MVP limitations](#current-mvp-limitations)). It has not been deployed.

## Features and quiz rules

- **Four categories:** General Knowledge, States & Geography, Food & Culture, and Music & Entertainment.
- **10 questions per game**, picked at random from the chosen category with no repeats within a game.
- **Four answer options per question**, shuffled for every question and labelled A–D.
- **10-second timer** for each question.
- **Scoring:** correct answer = 10 points; incorrect answer or timeout = 0 points; maximum 100 points.
- **Answers are final.** Once you choose an answer, it can't be changed.
- **Feedback after every question:** "Correct!", "Not quite!" or "Time's up!", with the correct answer highlighted. You move on by clicking **NEXT** (there is no auto-advance).
- **Results screen** with your score out of 100, the number of correct answers, a progress bar and a message:

  | Score | Message |
  |---|---|
  | 90–100 | Nigeria Expert! 🏆 |
  | 70–89 | Great Job! 🔥 |
  | 50–69 | Not Bad! 👍 |
  | 0–49 | Keep Learning! 📚 |

- **Play Again** (a fresh set of questions in the same category) or **Choose Another Category**.
- **Light and dark themes:** a toggle in the top-right corner switches themes and remembers your choice in the browser; first-time visitors always start in light mode.
- **Accessibility:** real buttons, visible keyboard focus, keyboard shortcuts (press `A`–`D` or `1`–`4` to answer), correct/incorrect feedback that doesn't rely on colour alone, and decorative animation disabled for users who prefer reduced motion.

The product requirements are in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## Technologies

| | Version |
|---|---|
| [Next.js](https://nextjs.org) (App Router, Turbopack) | 16.4.0 |
| [React](https://react.dev) | 19.3.0 |
| [TypeScript](https://www.typescriptlang.org) | 5.x |
| [Tailwind CSS](https://tailwindcss.com) | 4.x |
| [ESLint](https://eslint.org) | 9.x |
| [Vitest](https://vitest.dev) | 5.x |

Package manager: **npm** (`package-lock.json`). Fonts are Geist and Geist Mono via `next/font/google`, which Next.js downloads at build time.

There is no database, backend, API route, authentication or environment variable.

## Prerequisites

- **Node.js** `^22.12`, `^24` or `>=26`, and **npm**. This range comes from Vitest 5, the most restrictive dependency. Next.js itself only needs Node 20.9 or newer, but Vitest does not support Node 23 or 25. Developed and tested on Node 24.16 with npm 11.13.
- An internet connection for the first `npm install` and for downloading fonts during a build.

## Installation and setup

```bash
git clone <repository-url>
cd how-well-do-you-know-nigeria
npm install
```

## Running the project

| Command | What it does |
|---|---|
| `npm run dev` | Starts the development server at http://localhost:3000 |
| `npm test` | Runs the test suite once (Vitest) |
| `npm run test:watch` | Runs the tests in watch mode |
| `npm run lint` | Runs ESLint |
| `npx tsc --noEmit` | Type-checks the project (not an npm script) |
| `npm run build` | Creates a production build |
| `npm start` | Serves the production build (run `npm run build` first) |

**Development note:** changes to `src/app/globals.css` are not picked up by the running dev server. After editing it, stop the server, delete the `.next` folder and run `npm run dev` again.

## Tests

The tests cover the game logic, the question data, the theme script and the colour contrast (not the React components):

- `tests/quizReducer.test.ts`: game state transitions, scoring, answer locking, timeout handling, results and replay.
- `tests/selectQuestions.test.ts`: random selection, no repeated questions, option shuffling.
- `tests/scoring.test.ts`: scoring constants, result-message bands and score boundaries.
- `tests/data.test.ts`: validates the question bank (see below).
- `tests/theme.test.ts`: the light/dark theme helper and the script that restores the saved theme before the page paints.
- `tests/contrast.test.ts`: checks the light and dark colours against WCAG AA contrast ratios, and that the Nigerian flag's colours stay fixed.

## Project structure

```
src/
  app/                  Next.js App Router: layout, single page, global styles and theme colours
  components/
    Game.tsx            Client component: holds the game state and shows the current screen
    screens/            HomeScreen, CategoryScreen, QuizScreen, ResultsScreen
    quiz/               QuestionPanel, AnswerOption, TimerBar, FeedbackBanner
    results/            Trophy and Confetti (decorative)
    ui/                 Shared Button, ThemeToggle (light/dark switch), NigerianFlag (fixed-colour flag mark)
  data/
    categories.ts       The four categories
    questions/          One file per category, plus index.ts combining them
  lib/
    types.ts            Shared types
    theme.ts            Theme helpers and the script that applies the saved theme before first paint
    quiz/               quizReducer, scoring, selectQuestions, useCountdown, validateQuestions
tests/                  Vitest tests
PROJECT_CONTEXT.md      Product requirements
```

The app is a single page with no router. `Game` uses one reducer (`quizReducer`) whose `screen` value (`home`, `category`, `quiz` or `results`) decides what is shown. Question data is kept separate from the UI.

### Question data

Each question has this shape (see `src/lib/types.ts`):

```ts
{
  id: "geo-001",
  question: "What is the capital of Nigeria?",
  options: ["Lagos", "Abuja", "Kano", "Ibadan"],
  answer: "Abuja",
  category: "states-and-geography",
  difficulty: "easy",
}
```

The tests require every question to have exactly four unique options, an `answer` that matches one of them, and a unique `id`, and every category to have at least 10 questions. `difficulty` is stored but does not affect gameplay.

## Current MVP limitations

- **The questions are unreviewed sample data:** 47 in total (12 General Knowledge, 12 States & Geography, 12 Food & Culture, 11 Music & Entertainment). A larger, fact-checked question bank is still to be written.
- **Refreshing the page resets the game.** Nothing is saved.
- **No Home button on the results screen.** You can replay or choose another category, and Back from the category screen leads to Home.
- **Leaving a quiz with Back discards the game** with no confirmation.
- **Not included:** accounts, a leaderboard, multiplayer, saved history, sharing, or a backend.
- **Limited testing:** only the logic and data are covered by automated tests. The UI has been checked in a desktop browser (headless Edge on Windows) at desktop, tablet and phone widths, but not on a real phone or with a screen reader.
