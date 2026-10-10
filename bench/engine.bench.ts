/**
 * Hot paths of a room server: every action is followed by one view per player.
 * Run with `npm run bench`. Compare the numbers before and after a change.
 */
import { Bench } from "tinybench";
import { noTalkAmCards } from "@/data/noTalkAmCards";
import { allQuestions } from "@/data/questions";
import { sortItems } from "@/data/sortItems";
import { yearItems } from "@/data/yearItems";
import type { TriviaView } from "@/lib/modes/trivia";
import { matchesAnswer } from "@/lib/modes/textMatch";
import {
  createRoom,
  roomNextDeadline,
  roomReduce,
  roomTick,
  roomViews,
  type RoomEnv,
  type RoomState,
} from "@/lib/room/engine";

let seed = 1;
const rng = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const env: RoomEnv = {
  now: 1_000_000,
  rng,
  content: { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems },
};
const ids = Array.from({ length: 8 }, (_, i) => `p${i}`);

function fullLobby(): RoomState {
  let s = createRoom("ABCDE");
  for (const [i, id] of ids.entries()) {
    s = roomReduce(s, id, { type: "join", name: `Player ${i}` }, env).state;
    s = roomReduce(s, id, { type: "set_team", teamId: i % 2 ? "t1" : "t0" }, env).state;
  }
  return s;
}

const lobby = fullLobby();

// A launch-sized bank: 2,000 questions, to show how the hot paths scale with content.
const bigBank = Array.from({ length: 2000 }, (_, i) => ({ ...allQuestions[i % allQuestions.length], id: `big-${i}` }));
const bigEnv: RoomEnv = { ...env, content: { ...env.content, questions: bigBank } };

function triviaMatch() {
  let s = roomReduce(lobby, "p0", { type: "start" }, env).state;
  let now = env.now;
  while (s.status === "playing") {
    const view = roomViews(s, { ...env, now }).get("p0")!.match as TriviaView;
    if (view.phase === "question" && view.question) {
      for (const id of ids) {
        const action = { type: "mode", action: { type: "lock", option: view.question.options[0] } } as const;
        s = roomReduce(s, id, action, { ...env, now }).state;
        roomViews(s, { ...env, now });
      }
    }
    now = roomNextDeadline(s) ?? now;
    s = roomTick(s, { ...env, now });
    roomViews(s, { ...env, now });
  }
}

const bench = new Bench({ time: 1000 });
bench
  .add("lobby: views for 8 players", () => {
    roomViews(lobby, env);
  })
  .add("lobby: views for 8 players, 2,000-question bank", () => {
    roomViews(lobby, bigEnv);
  })
  .add("trivia: full match, 8 players, broadcast after every action", triviaMatch)
  .add("text match: 100 guesses", () => {
    for (let i = 0; i < 100; i++) matchesAnswer(i % 3 ? "jolof rice" : "jolof", ["Jollof", "Jollof rice"]);
  });

void bench.run().then(() => console.table(
  bench.tasks.map((t) => ({
    task: t.name,
    "mean (µs)": ((t.result?.mean ?? 0) * 1000).toFixed(1),
    "ops/s": Math.round(t.result?.hz ?? 0),
  })),
));
