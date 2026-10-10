/**
 * Load test for the room server. Start the server first (`npm run server`), then:
 *   npm run load -- 100        # 100 rooms × 8 players
 * Each room plays trivia: every player locks an answer at a random moment in each question, and
 * we time each lock until that player receives the updated view (the round trip a player feels).
 * Run the load generator on a different machine from the server for numbers that mean anything.
 */
import WebSocket from "ws";
import type { TriviaView } from "@naija/game/modes/trivia";
import type { ServerMessage } from "@naija/game/room/protocol";

const SERVER = process.env.ROOM_SERVER_URL ?? "http://localhost:8787";
const ROOMS = Number(process.argv[2] ?? 50);
const PLAYERS_PER_ROOM = 8;
const QUESTIONS_TO_PLAY = 3;

const latencies: number[] = [];
let failures = 0;

function percentile(sorted: number[], p: number) {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : NaN;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Rooms arrive spread over this window, like real players, instead of all in one instant. */
const ARRIVAL_MS = 4000;

async function runRoom(roomIndex: number): Promise<void> {
  await sleep(Math.random() * ARRIVAL_MS);
  const res = await fetch(`${SERVER}/rooms`, { method: "POST" });
  const { code } = (await res.json()) as { code: string };
  const sockets: WebSocket[] = [];
  const views: (TriviaView | null)[] = [];
  const pending = new Map<number, number>(); // player index → time the lock was sent
  let hostReady!: () => void;
  const started = new Promise<void>((r) => (hostReady = r));
  let questionsSeen = 0;
  let done!: () => void;
  const finished = new Promise<void>((r) => (done = r));

  for (let i = 0; i < PLAYERS_PER_ROOM; i++) {
    // The first player is the host: let them in before the others.
    if (i === 1) await new Promise<void>((r) => sockets[0].once("message", () => r()));
    const ws = new WebSocket(`${SERVER.replace(/^http/, "ws")}/rooms/${code}`);
    sockets.push(ws);
    views.push(null);
    const id = `r${roomIndex}p${i}`;
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "hello", playerId: id, secret: `${id}-secret-padding-xx`, name: id }));
      ws.send(JSON.stringify({ type: "action", action: { type: "set_team", teamId: i % 2 ? "t1" : "t0" } }));
    });
    ws.on("error", () => failures++);
    ws.on("message", (data) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      if (message.type !== "view") return;
      const sent = pending.get(i);
      if (sent !== undefined) {
        latencies.push(performance.now() - sent);
        pending.delete(i);
      }
      if (i === 0 && message.view.status === "lobby" && message.view.startProblem === null) hostReady();
      const match = message.view.match as TriviaView | null;
      const previous = views[i];
      views[i] = match;
      if (match?.phase === "question" && match.index !== previous?.index) {
        if (i === 0) stuck[roomIndex] = `room ${roomIndex}: question ${match.index}`;
        if (i === 0 && ++questionsSeen > QUESTIONS_TO_PLAY) return done();
        // Lock at a random moment in the first 3 seconds of the question.
        setTimeout(() => {
          pending.set(i, performance.now());
          ws.send(JSON.stringify({ type: "action", action: { type: "mode", action: { type: "lock", option: match.question!.options[i % 4] } } }));
        }, Math.random() * 3000);
      }
      // The host skips the reveal so the test moves along.
      if (i === 0 && match?.phase === "reveal" && previous?.phase === "question") {
        setTimeout(() => ws.send(JSON.stringify({ type: "action", action: { type: "mode", action: { type: "next" } } })), 200);
      }
    });
  }

  stuck[roomIndex] = `room ${roomIndex}: waiting for lobby`;
  await started;
  stuck[roomIndex] = `room ${roomIndex}: started`;
  // "Everyone answers": every lock changes every player's view (the answered count), so each
  // lock is a full broadcast. That is the heavier, worst case for the server.
  sockets[0].send(JSON.stringify({ type: "action", action: { type: "set_trivia", answerRule: "individual" } }));
  sockets[0].send(JSON.stringify({ type: "action", action: { type: "start" } }));
  await finished;
  sockets.forEach((ws) => ws.close());
}

const stuck: string[] = [];
function report(extra: Record<string, unknown> = {}) {
  const sorted = [...latencies].sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      rooms: ROOMS,
      players: ROOMS * PLAYERS_PER_ROOM,
      locks: sorted.length,
      failures,
      p50: +percentile(sorted, 50).toFixed(1),
      p95: +percentile(sorted, 95).toFixed(1),
      p99: +percentile(sorted, 99).toFixed(1),
      max: +(sorted.at(-1) ?? NaN).toFixed(1),
      ...extra,
    }),
  );
}

setTimeout(() => {
  report({ error: "timed out", stuck: stuck.filter((x) => x && !x.includes("question 3")).slice(0, 5) });
  process.exit(1);
}, 90_000);

const t0 = performance.now();
await Promise.all(Array.from({ length: ROOMS }, (_, i) => runRoom(i)));
report({ seconds: +((performance.now() - t0) / 1000).toFixed(1) });
process.exit(0);
