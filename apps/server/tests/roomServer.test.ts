import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { noTalkAmCards } from "@naija/game/data/noTalkAmCards";
import { allQuestions } from "@naija/game/data/questions";
import { sortItems } from "@naija/game/data/sortItems";
import { yearItems } from "@naija/game/data/yearItems";
import type { TriviaView } from "@naija/game/modes/trivia";
import type { ClientAction } from "@naija/game/room/engine";
import { CLOSE_BAD_SECRET, CLOSE_ROOM_NOT_FOUND, type ServerMessage } from "@naija/game/room/protocol";
import { startRoomServer } from "../src/roomServer";

let server: Awaited<ReturnType<typeof startRoomServer>>;
let base = "";

beforeAll(async () => {
  server = await startRoomServer({
    port: 0,
    content: { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems },
  });
  base = `http://localhost:${server.port}`;
});
afterAll(() => server.close());

/** A phone: a real WebSocket plus every message it received. */
class Phone {
  ws: WebSocket;
  messages: ServerMessage[] = [];
  closeCode: Promise<number>;
  constructor(code: string, public id: string, secret = `${id}-secret-0123456789`, name = id, port = server.port) {
    this.ws = new WebSocket(`ws://localhost:${port}/rooms/${code}`);
    this.ws.on("message", (data) => this.messages.push(JSON.parse(data.toString())));
    this.ws.on("open", () => this.ws.send(JSON.stringify({ type: "hello", playerId: id, secret, name })));
    this.closeCode = new Promise((resolve) => this.ws.on("close", (code) => resolve(code)));
  }
  act(action: ClientAction) {
    this.ws.send(JSON.stringify({ type: "action", action }));
  }
  get view() {
    return [...this.messages].reverse().find((m) => m.type === "view")?.view ?? null;
  }
  get chat() {
    return this.messages.flatMap((m) => (m.type === "chat" ? m.messages.map((c) => c.text) : []));
  }
  async until<T>(check: () => T | null | undefined | false, ms = 2000): Promise<T> {
    const end = Date.now() + ms;
    for (;;) {
      const value = check();
      if (value) return value;
      if (Date.now() > end) throw new Error(`${this.id}: timed out; last: ${JSON.stringify(this.messages.at(-1))}`);
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}

async function newRoom(): Promise<string> {
  const res = await fetch(`${base}/rooms`, { method: "POST" });
  expect(res.status).toBe(201);
  return ((await res.json()) as { code: string }).code;
}

describe("room server", () => {
  it("answers health checks", async () => {
    const res = await fetch(`${base}/health`);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("creates a room that opens on the requested game, and rejects games a private room can't use", async () => {
    const res = await fetch(`${base}/rooms`, { method: "POST", body: JSON.stringify({ mode: "no-talk-am" }) });
    expect(res.status).toBe(201);
    const ada = new Phone(((await res.json()) as { code: string }).code, "ada");
    await ada.until(() => ada.view?.settings.mode === "no-talk-am");
    ada.ws.close();

    for (const mode of ["battle-royale", "nonsense"]) {
      const bad = await fetch(`${base}/rooms`, { method: "POST", body: JSON.stringify({ mode }) });
      expect(bad.status).toBe(400);
    }
  });

  it("plays trivia across two real connections, keeping the answer secret until the reveal", async () => {
    const code = await newRoom();
    const ada = new Phone(code, "ada");
    await ada.until(() => ada.view?.players.length === 1);
    const bayo = new Phone(code, "bayo");
    await ada.until(() => ada.view?.players.length === 2);

    ada.act({ type: "set_team", teamId: "t0" });
    bayo.act({ type: "set_team", teamId: "t1" });
    await ada.until(() => ada.view?.startProblem === null);
    ada.act({ type: "start" });

    const q = await bayo.until(() => bayo.view?.match?.mode === "trivia" && (bayo.view.match as TriviaView));
    expect(q.answer).toBeNull();
    expect(JSON.stringify(bayo.messages)).not.toContain('"answer":"');

    ada.act({ type: "mode", action: { type: "lock", option: q.question!.options[0] } });
    bayo.act({ type: "mode", action: { type: "lock", option: q.question!.options[1] } });
    const revealed = await bayo.until(() => {
      const m = bayo.view?.match as TriviaView | undefined;
      return m?.phase === "reveal" && m;
    });
    expect(revealed.answer).toBeTruthy();
    ada.ws.close();
    bayo.ws.close();
  });

  it("delivers room chat to everyone and team chat only to the team", async () => {
    const code = await newRoom();
    const [a, b, c] = ["cat", "dan", "eze"].map((id) => new Phone(code, id));
    await a.until(() => a.view?.players.length === 3);
    a.act({ type: "set_team", teamId: "t0" });
    b.act({ type: "set_team", teamId: "t0" });
    c.act({ type: "set_team", teamId: "t1" });
    await c.until(() => c.view?.players.every((p) => p.teamId !== null));
    a.act({ type: "chat", text: "hello everyone", toTeam: false });
    a.act({ type: "chat", text: "team secret", toTeam: true });
    await b.until(() => b.chat.includes("team secret"));
    await c.until(() => c.chat.includes("hello everyone"));
    await new Promise((r) => setTimeout(r, 50));
    expect(c.chat).not.toContain("team secret");
    [a, b, c].forEach((p) => p.ws.close());
  });

  it("sends a view only when it changed", async () => {
    const code = await newRoom();
    const p = new Phone(code, "fola");
    await p.until(() => p.view);
    const before = p.messages.filter((m) => m.type === "view").length;
    p.act({ type: "set_team", teamId: "t0" });
    p.act({ type: "set_team", teamId: "t0" }); // no change: no second view
    await p.until(() => p.view?.players[0].teamId === "t0");
    await new Promise((r) => setTimeout(r, 50));
    expect(p.messages.filter((m) => m.type === "view").length).toBe(before + 1);
    p.ws.close();
  });

  it("keeps a seat for its owner only", async () => {
    const code = await newRoom();
    const owner = new Phone(code, "gbenga", "the-real-secret-123456");
    await owner.until(() => owner.view);
    const thief = new Phone(code, "gbenga", "a-guessed-secret-12345");
    expect(await thief.closeCode).toBe(CLOSE_BAD_SECRET);
    owner.ws.close();
  });

  it("ignores malformed messages instead of crashing the room", async () => {
    const code = await newRoom();
    const p = new Phone(code, "halima");
    await p.until(() => p.view);
    for (const junk of ["not json", "{}", '{"type":"action","action":{"type":"chat","text":5}}', '{"type":"action","action":{"type":"mode","action":{"type":"answer","answer":{}}}}']) {
      p.ws.send(junk);
    }
    p.act({ type: "chat", text: "still alive", toTeam: false });
    await p.until(() => p.chat.includes("still alive"));
    p.ws.close();
  });

  it("tells a phone when the room does not exist", async () => {
    const p = new Phone("ZZZZZ", "ifeoma");
    expect(await p.closeCode).toBe(CLOSE_ROOM_NOT_FOUND);
  });
});

describe("Quick Play", () => {
  let qp: Awaited<ReturnType<typeof startRoomServer>>;
  beforeAll(async () => {
    qp = await startRoomServer({
      port: 0,
      content: { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems },
      queues: { solo: { minPlayers: 2, countdownMs: 300 } },
    });
  });
  afterAll(() => qp.close());

  const quickplay = async (queue: string) => {
    const res = await fetch(`http://localhost:${qp.port}/quickplay`, { method: "POST", body: JSON.stringify({ queue }) });
    return { status: res.status, body: (await res.json()) as { code?: string } };
  };

  it("puts players looking for a game into the same public room, which starts by itself", async () => {
    const first = await quickplay("solo");
    const second = await quickplay("solo");
    expect(first.body.code).toBeTruthy();
    expect(second.body.code).toBe(first.body.code);

    const a = new Phone(first.body.code!, "qa", undefined, "qa", qp.port);
    const b = new Phone(first.body.code!, "qb", undefined, "qb", qp.port);
    await a.until(() => a.view?.kind === "public" && a.view.startsAt !== null);
    await b.until(() => b.view?.match?.mode === "battle-royale", 3000);
    expect(b.view?.hostId).toBeNull();
    a.ws.close();
    b.ws.close();
  });

  it("opens a new room once the filling one has started", async () => {
    const { body } = await quickplay("solo");
    expect(body.code).toBeTruthy();
  });

  it("rejects unknown queues", async () => {
    expect((await quickplay("chaos")).status).toBe(400);
  });
});
