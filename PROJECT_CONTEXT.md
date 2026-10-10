# How Well Do You Know Nigeria?

## 1. Product Overview

How Well Do You Know Nigeria? is a fun, interactive trivia game that tests players' knowledge of Nigeria.

Players answer multiple-choice questions across different categories such as Nigerian general knowledge, geography, food, culture, music and entertainment.

The goal is to make learning about Nigeria fun, simple and replayable.

---

## 2. Target Users

The game is designed for:

- Nigerian teenagers and adults
- University students
- Young professionals
- People interested in Nigerian culture
- Non-Nigerians who want to learn about Nigeria

The game should be easy to understand and enjoyable for casual players.

---

## 3. MVP Goal

The first version should focus only on the core trivia experience.

A player should be able to:

1. Open the application.
2. Select a category.
3. Start a quiz.
4. Answer 10 questions.
5. Receive feedback after each answer.
6. See their score.
7. View their final result.
8. Play again.

Do not build advanced features until this core experience works properly.

---

## 4. MVP Categories

The initial categories are:

### General Knowledge
Questions about Nigeria and general Nigerian knowledge.

### States & Geography
Questions about Nigerian states, cities, landmarks, rivers, regions and geography.

### Food & Culture
Questions about Nigerian food, traditions, languages, festivals and culture.

### Music & Entertainment
Questions about Nigerian music, musicians, Nollywood and entertainment.

---

## 5. Game Rules

Each game contains 10 questions.

Each question has four possible answers.

The player picks one answer and can change it until the answer is revealed (when time runs out, or when they choose Check answer).

Each question has a 10-second countdown timer.

Scoring:

- Correct answer = 10 points
- Incorrect answer = 0 points
- Time expires with no pick = 0 points

Maximum score per game = 100 points.

Once the answer has been revealed, the player cannot change it. If time runs out, the latest pick is scored; with no pick, the question scores 0.

The game should show whether the answer was correct or incorrect before moving to the next question.

---

## 6. Game Flow

Home

↓

Category Selection

↓

Start Game

↓

Question 1

↓

Answer

↓

Feedback

↓

Question 2

↓

...

↓

Question 10

↓

Results

↓

Play Again / Choose Another Category / Home

---

## 7. Question Data

Question data must be kept separate from the UI.

Each question should contain:

- question
- options
- correct answer
- category
- difficulty

Example:

```typescript
{
  question: "What is the capital of Nigeria?",
  options: ["Lagos", "Abuja", "Kano", "Ibadan"],
  answer: "Abuja",
  category: "states-and-geography",
  difficulty: "easy"
}
```
