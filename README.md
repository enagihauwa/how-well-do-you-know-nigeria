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
- **Settings** (top-right button, in a bottom sheet): **Look** follows the phone's light/dark setting by default, or can be set to Light or Dark; **Language** is English or Pidgin. All text lives in `apps/web/src/lib/i18n/copy.ts`.
- **Design:** green-led and quiet. Colours are tokens in `apps/web/src/app/globals.css` (checked for WCAG AA contrast in both themes by `apps/web/tests/contrast.test.ts`); headings use Bricolage Grotesque and body text Figtree. Choices that are not needed all the time (settings, invite, game picker, chat) open in bottom sheets.
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
npm run dev          # the app at http://localhost:3000 + the room server on :8787
```

That runs everything: multiplayer, accounts, progress, ranked and leaderboards. Without a database, accounts and progress live in the server's memory and reset when it restarts; to keep them, create a Postgres database and put `DATABASE_URL=postgres://localhost/naija_trivia` in `apps/server/.env` (see `apps/server/.env.example`). Tables are created on start.

`npm run dev:web` runs the app alone in **test mode**: rooms live in your browser tab, other tabs on the same device can join, Quick Play fills with bots so you can try every game alone, and there are no accounts.

Other devices on your Wi-Fi can't reach `localhost`; to test on a phone, deploy the room server (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

**Bots:** if a Quick Play room is still short of players 20 seconds after the first person joins (5 seconds in test mode), bots fill the empty places and the match starts. Bots are always labelled "(bot)" and answer like a decent player: right about 80% of the time on easy questions, 60% on medium, 40% on hard.

| Command | What it does |
|---|---|
| `npm run dev` | The app and the room server together (multiplayer, accounts, ranked) |
| `npm run dev:web` | The app alone (multiplayer in test mode, no accounts) |
| `npm run server` | Room server (WebSocket + HTTP) |
| `npm run dev:server` | Room server, restarting on changes |
| `npm test` | All tests in every package once (Vitest), including the room server's real-socket tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type-check every package |
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
| `DATABASE_URL` | room server | Postgres for accounts and progress. Unset: in memory, lost on restart. **Set it in production.** |
| `BETTER_AUTH_SECRET` | room server | Signs session tokens (`openssl rand -base64 32`). **Required in production**; the server refuses to start without it. |
| `PUBLIC_URL` | room server | The server's own public URL, e.g. `https://naija-rooms.up.railway.app`. |
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

- **The rules are pure TypeScript** in `packages/game/src/modes/` (one file per game) and `packages/game/src/room/engine.ts` (lobby, teams, host, presence, chat, public rooms). No React, no browser APIs, no clock or randomness of their own, so the same code runs in the server, the local test mode and the tests.
- **`RoomHost`** (`packages/game/src/room/host.ts`) runs one room: applies actions, runs the deadline timer, and sends each player *their own* view only when it changed. Secrets (trivia answers, the No Talk Am word) are never in another player's view.
- **The server** (`apps/server/src/roomServer.ts`) validates every message (`packages/game/src/room/validate.ts`), ties each seat to a secret so nobody can take another player's place, drops dead connections, rate-limits, and matches Quick Play players into public rooms.
- **The phone** (`apps/web/src/lib/room/wsTransport.ts`) reconnects with backoff, and at once when the app comes back to the front or the network returns. Timers are drawn from the server's deadline with a CSS animation, so the timer costs no JavaScript per frame.

**Capacity** (measured with `npm run load` on an Apple-silicon Mac, load generator on the same machine): one room-server process handled 1,000 concurrent players at 53% of one core with a 1.5 ms 99th-percentile round trip, and up to 4,000 before saturating one core; 8,000 failed. Plan on roughly 1,000–1,500 players per process on a typical cloud core, and scale out by running more processes with rooms spread across them.

## Accounts, progress and ranked

- **Accounts are optional.** Every device gets a guest profile on first use (Better Auth's anonymous users), so XP and badges count from the first game. Signing up (email and password) keeps that progress and works on any phone; signing in on a device with guest progress merges it in. Guests can do everything except ranked, and they don't appear on leaderboards. Sessions are bearer tokens, not cookies, because the site and the server are on different domains.
- **Progress** (`packages/game/src/progress/progress.ts`, pure): XP and levels, a daily streak on Lagos time, badges, and per game: wins, games played, games vs bots, best score. The server works out results from the match itself (`room/results.ts`) and saves them once per match, so a phone can't award itself anything. Solo quiz results are reported by the phone, validated and rate-limited, and never count for wins or rank.
- **Wins count only against people.** A match against bots alone is practice: half XP, no wins.
- **Ranked** (`packages/game/src/ranking/ranked.ts`), Valorant-style: a Ranked Quick Play queue per game (Trivia, Guess the Year, Sort Am, Who Go Remain?), every player for themselves, no bots, signed-up accounts only, one seat per account. A hidden MMR (Elo) measures skill; the visible rank is JJC 1 → Chairman 3, then Odogwu, with RR 0–99. Win and gain RR, lose and drop; the gap between MMR and rank nudges each change, so you climb to where you belong. 100 RR promotes, below 0 demotes, the first 5 matches are placements, and Odogwu's RR is uncapped. Private rooms and casual Quick Play never change rank. Matchmaking pairs similar MMR, widening the window the longer a room waits.
- **Leaderboards** per game, by wins or by rank: `/leaderboard`. Your profile is `/me`.

## Tests

Logic, data, the room engine, every game mode, ratings and the room server (over real WebSockets) are covered; the React components are not. Each package keeps its tests in its own `tests/` folder. Main files:

- `packages/game/tests/`: `selectQuestions`, `scoring`, `data` (question bank), `triviaMode`, `noTalkAmMode`, `roundModes`, `battleRoyale` (each game mode, including that secrets never leak), `bots`, `roomEngine` (lobby, teams, host handover, seats, chat, Quick Play rooms), `rating`, `textMatch`.
- `apps/server/tests/roomServer.test.ts`: the real server with real sockets: a match, chat privacy, seat ownership, malformed input, matchmaking.
- `apps/server/tests/accounts.test.ts`: guests, sign-up keeping progress, a full match saved for both players, leaderboards, ranked access rules.
- `apps/server/tests/postgresStore.test.ts`: the Postgres store against a real database; runs when `TEST_DATABASE_URL` is set.
- `packages/game/tests/progress.test.ts`, `ranked.test.ts`: XP, streaks, badges, merging, placements, RR, promotion and demotion.
- `apps/web/tests/`: `quizReducer` (solo game), `theme`, `contrast`.

## Project structure

```
packages/game/          @naija/game: the game itself, shared by the app and the server (pure TS)
  src/modes/            Game modes, bots and the mode contract
  src/room/             Engine, RoomHost, protocol, validation, room codes, Quick Play queues
  src/data/             Categories, questions, No Talk Am cards, years, Sort Am items
  src/quiz/, ranking/   Scoring, question selection, ratings and tiers
  bench/                Engine micro-benchmarks
apps/server/            @naija/server: room server (Node, ws): src/index.ts entry point, src/roomServer.ts
  bench/                Load test
apps/web/               @naija/web: the Next.js app
  src/app/              Routes: / (solo), /room (create, join, Quick Play), /room/[code]
  src/components/       Solo screens, room lobby and game screens, chat, UI kit
  src/lib/room/         Browser side of rooms: transports (WebSocket, local test mode), useRoom
  src/lib/i18n/, quiz/  English and Pidgin copy; solo reducer and timers
scripts/dev-all.mjs     Runs the app and the room server together
```

npm workspaces link the three packages. The app and the server import shared code as `@naija/game/...` (for example `@naija/game/room/engine`), straight from TypeScript source with no build step: Next compiles workspace packages itself, and the server runs on `tsx`.

## Current limitations

- **Content is unreviewed sample data:** 47 questions, 48 No Talk Am cards, 24 years and 10 Sort Am items. A larger, fact-checked bank (with regions and sources) is still to be written, and the Pidgin needs a native speaker's review. Battle royale in particular needs many more questions.
- **Rooms live in the room server's memory** and are lost when it restarts; progress is saved, rooms are not. No match history, friends or saved teams yet.
- **No password reset yet:** it needs an email service. A forgotten password means a new account for now.
- **No voice chat yet** (planned: opt-in team voice). No Talk Am needs everyone in one place until then, since the describer's chat is muted.
- **Public rooms need moderation tools** (reporting) before launch, and a privacy policy for the Nigeria Data Protection Act 2023.
- **UI tests are manual:** checked in headless Chromium at phone size, not yet on real phones or with a screen reader.
