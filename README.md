# How Well Do You Know Nigeria?

A Nigerian trivia party game. Play solo, play with friends in a private room, or jump into a public battle royale against players across Naija.

> **Status:** in development, not deployed. Solo and multiplayer both work. The question bank and game content are unreviewed sample data (see [Current limitations](#current-limitations)).

## What you can play

**Solo:** pick a category and answer 10 timed questions (10 seconds each, 10 points per correct answer, 100 maximum). You can change your pick until the reveal: when time runs out or you tap **Check answer**. Feedback after every question, then a results screen with Play Again or Choose Another Category.

**With friends (private room):** create a room, share the code or tap **Invite on WhatsApp**, pick teams (1 to 4 teams, up to 8 players), and the host picks a game:

| Game | How it works |
|---|---|
| Trivia | Team trivia. The host chooses *one answer per team* (any teammate can set or change the team's pick) or *everyone answers* (team score is the total). |
| No Talk Am | Taboo-style. Each round one teammate sees a Nigerian word and the words they must not say, and describes it; teammates type guesses (typos and other spellings are accepted). The describer rotates each round. |
| Guess the Year | When did it happen? Exact year scores 20, the closest guess 10, within 3 years 5. |
| Sort Am | Tap four items into the right order (oldest first, north to south…). 5 points per item in the right place. |

**Quick Play (public):** no code needed. The server puts you in a public room that starts by itself once enough players are in.

| Queue | How it works |
|---|---|
| Who Go Remain? | Battle royale, up to 50 players. Everyone answers each question; a wrong or missed answer costs a life (2 lives). If everyone still in gets it wrong, nobody loses a life. Questions go from easy to hard. Last one standing wins. |
| Squad Who Go Remain? | The same, in randomly dealt squads of 3. A squad is in while any member is. |

Public rooms only allow preset quick-chat phrases ("Oya! 🔥", "Well played"…), never free text, because players are strangers. Private rooms have free-text chat, to everyone or to your team only.

**Also:**
- **Settings** (top-right button, in a bottom sheet): **Look** follows the phone's light/dark setting by default, or can be set to Light or Dark; **Language** is English or Pidgin. All text lives in `src/lib/i18n/copy.ts`.
- **Design:** green-led and quiet. Colours are tokens in `src/app/globals.css` (checked for WCAG AA contrast in both themes by `tests/contrast.test.ts`); headings use Bricolage Grotesque and body text Figtree. Choices that are not needed all the time (settings, invite, game picker, chat) open in bottom sheets.
- **Reconnecting:** a phone that drops off the network or reloads gets its seat back (held for 60 seconds). A host who drops stays host for 10 seconds before the role passes on.
- **Accessibility:** real buttons and form controls, visible keyboard focus, keyboard shortcuts in solo (`A`–`D` or `1`–`4`), feedback that doesn't rely on colour alone, and decorative animation off for users who prefer reduced motion.
- **Ad slots** (off by default) on calm screens only: home, results and between rounds, never during a question.

The product requirements are in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). The multiplayer plan is in the Cursor plan *Collaborative room architecture*.

## Technologies

| | Version |
|---|---|
| [Next.js](https://nextjs.org) (App Router, Turbopack, React Compiler) | 16.4.0 |
| [React](https://react.dev) | 19.3.0 |
| [TypeScript](https://www.typescriptlang.org) | 5.x |
| [Tailwind CSS](https://tailwindcss.com) | 4.x |
| [ws](https://github.com/websockets/ws) (room server) | 8.18 |
| [tsx](https://tsx.is) (runs the room server and scripts) | 4.19 |
| [Vitest](https://vitest.dev) | 5.x |

Package manager: **npm**. There is no database or authentication yet.

## Prerequisites

- **Node.js** `^22.12`, `^24` or `>=26`, and **npm** (the range comes from Vitest 5).
- An internet connection for the first `npm install` and for downloading fonts during a build.

## Running the project

```bash
npm install
npm run dev          # the app, at http://localhost:3000
```

With only `npm run dev`, multiplayer runs in **test mode**: rooms live in your browser tab, and other tabs on the same device can join. Quick Play works too, against bots, so you can try every game alone.

**Real multiplayer** (across phones and devices) needs the room server. One command starts both:

```bash
npm run dev:all      # room server on :8787 + the app pointed at it
```

Other devices on your Wi-Fi can't reach `localhost`; to test on a phone, deploy the room server (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

**Bots:** if a Quick Play room is still short of players 20 seconds after the first person joins (5 seconds in test mode), bots fill the empty places and the match starts. Bots are always labelled "(bot)" and answer like a decent player: right about 80% of the time on easy questions, 60% on medium, 40% on hard.

| Command | What it does |
|---|---|
| `npm run dev:all` | The app and the room server together (real multiplayer locally) |
| `npm run dev` | Development server for the app (multiplayer in test mode) |
| `npm run server` | Room server (WebSocket + HTTP) |
| `npm run dev:server` | Room server, restarting on changes |
| `npm test` | All tests once (Vitest), including the room server's real-socket tests |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check |
| `npm run build` / `npm start` | Production build of the app / serve it |
| `npm run bench` | Engine micro-benchmarks |
| `npm run load -- 100` | Load test: 100 rooms × 8 players against a running room server |

### Environment variables

| Variable | Where | Meaning |
|---|---|---|
| `NEXT_PUBLIC_ROOM_SERVER_URL` | app, at build time | Room server URL, e.g. `https://rooms.example.com`. Unset: local test mode. |
| `NEXT_PUBLIC_ADS_ENABLED` | app, at build time | `true` shows the ad slots. |
| `PORT` | room server | Port to listen on (set by most hosts). Default 8787. |
| `ALLOWED_ORIGINS` | room server | Comma-separated origins allowed to create and join rooms, e.g. `https://naijaquiz.app`. Unset: any origin. **Set it in production.** |
| `QUICKPLAY_MIN_PLAYERS`, `QUICKPLAY_COUNTDOWN_MS` | room server | Staging/testing only: start Quick Play matches with fewer players and a shorter countdown. |

### Deploying

Step-by-step instructions, including the Vercel + Railway setup and troubleshooting, are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).


The app and the room server are deployed separately. The app is a normal Next.js app (Vercel or any Node host). The room server is a long-running Node process (`npm run server`) on any host that supports WebSockets (Railway, Render, Fly…). Build the app with `NEXT_PUBLIC_ROOM_SERVER_URL` set to the room server's public URL, and set `ALLOWED_ORIGINS` on the server to the app's URL.

## How multiplayer works

```
phone ── WebSocket ──► room server ──► RoomHost (one per room) ──► room engine + game mode
                          │
                          └── POST /rooms, POST /quickplay, GET /health
```

- **The rules are pure TypeScript** in `src/lib/modes/` (one file per game) and `src/lib/room/engine.ts` (lobby, teams, host, presence, chat, public rooms). No React, no browser APIs, no clock or randomness of their own, so the same code runs in the server, the local test mode and the tests.
- **`RoomHost`** (`src/lib/room/host.ts`) runs one room: applies actions, runs the deadline timer, and sends each player *their own* view only when it changed. Secrets (trivia answers, the No Talk Am word) are never in another player's view.
- **The server** (`server/roomServer.ts`) validates every message (`src/lib/room/validate.ts`), ties each seat to a secret so nobody can take another player's place, drops dead connections, rate-limits, and matches Quick Play players into public rooms.
- **The phone** (`src/lib/room/wsTransport.ts`) reconnects with backoff, and at once when the app comes back to the front or the network returns. Timers are drawn from the server's deadline with a CSS animation, so the timer costs no JavaScript per frame.

**Capacity** (measured with `npm run load` on an Apple-silicon Mac, load generator on the same machine): one room-server process handled 1,000 concurrent players at 53% of one core with a 1.5 ms 99th-percentile round trip, and up to 4,000 before saturating one core; 8,000 failed. Plan on roughly 1,000–1,500 players per process on a typical cloud core, and scale out by running more processes with rooms spread across them.

**Rankings:** `src/lib/ranking/rating.ts` rates players from finishing order (Elo across the field; squads share their squad's change) and maps ratings to tiers: JJC, Learner, Sharp, Oga, Chairman, Odogwu. It is not wired up yet: ratings need accounts and a database to be stored.

## Tests

Logic, data, the room engine, every game mode, ratings and the room server (over real WebSockets) are covered; the React components are not. Main files:

- `tests/quizReducer.test.ts`, `selectQuestions.test.ts`, `scoring.test.ts`, `data.test.ts`: solo game and question bank.
- `tests/triviaMode.test.ts`, `noTalkAmMode.test.ts`, `roundModes.test.ts`, `battleRoyale.test.ts`: each game mode, including that secrets never leak.
- `tests/roomEngine.test.ts`: lobby, teams, host handover, seats, chat, Quick Play rooms.
- `tests/roomServer.test.ts`: the real server with real sockets: a match, chat privacy, seat ownership, malformed input, matchmaking.
- `tests/rating.test.ts`, `textMatch.test.ts`, `theme.test.ts`, `contrast.test.ts`.

## Project structure

```
server/                 Room server (Node, ws): index.ts entry point, roomServer.ts
bench/                  Engine benchmark and load test
src/
  app/                  Next.js routes: / (solo), /room (create, join, Quick Play), /room/[code]
  components/
    screens/, quiz/     Solo game screens
    room/               Lobby, public lobby, one screen per game, results, chat
    ui/                 Button, BottomSheet, AdSlot, toggles, flag
  data/                 Categories, questions, No Talk Am cards, years, Sort Am items
  lib/
    modes/              Game modes and the mode contract (pure)
    room/               Engine, host, protocol, validation, transports, hooks
    ranking/            Ratings and tiers (pure)
    i18n/               English and Pidgin copy
    quiz/               Solo reducer, scoring, selection, timers
tests/                  Vitest tests
```

## Current limitations

- **Content is unreviewed sample data:** 47 questions, 48 No Talk Am cards, 24 years and 10 Sort Am items. A larger, fact-checked bank (with regions and sources) is still to be written, and the Pidgin needs a native speaker's review. Battle royale in particular needs many more questions.
- **No accounts or database yet.** Ratings, match history, friends and saved teams wait on them; rooms live in the room server's memory and are lost when it restarts.
- **No voice chat yet** (planned: opt-in team voice).
- **Public rooms need moderation tools** (reporting) before launch, and a privacy policy for the Nigeria Data Protection Act 2023.
- **UI tests are manual:** checked in headless Chromium at phone size, not yet on real phones or with a screen reader.
