import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { noTalkAmCards } from "@naija/game/data/noTalkAmCards";
import { allQuestions } from "@naija/game/data/questions";
import { sortItems } from "@naija/game/data/sortItems";
import { yearItems } from "@naija/game/data/yearItems";
import type { TriviaView } from "@naija/game/modes/trivia";
import type { Award, Progress } from "@naija/game/progress/progress";
import type { ServerMessage } from "@naija/game/room/protocol";
import { createAccounts, type Accounts } from "../src/accounts";
import { startRoomServer } from "../src/roomServer";
import { TestPhone } from "./phone";

let server: Awaited<ReturnType<typeof startRoomServer>>;
let accounts: Accounts;
let base = "";
const ORIGIN = "http://localhost:3000";

beforeAll(async () => {
  accounts = await createAccounts({ secret: "test-secret-test-secret-test-secret-123", baseURL: "http://localhost", allowedOrigins: [] });
  server = await startRoomServer({
    port: 0,
    content: { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems },
    accounts,
  });
  base = `http://localhost:${server.port}`;
});
afterAll(() => server.close());

const post = (path: string, body: unknown, token?: string) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });
const get = (path: string, token?: string) => fetch(`${base}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

async function guest(): Promise<string> {
  const res = await post("/api/auth/sign-in/anonymous", {});
  expect(res.status).toBe(200);
  return res.headers.get("set-auth-token")!;
}

let emails = 0;
/** Signs up from a guest session; returns the account's token. */
async function signUp(guestToken: string, name: string): Promise<string> {
  const res = await post("/api/auth/sign-up/email", { email: `p${++emails}@example.com`, password: "a good password", name }, guestToken);
  expect(res.status).toBe(200);
  return res.headers.get("set-auth-token")!;
}

const me = async (token: string) => (await (await get("/api/me", token)).json()) as { user: { name: string; isAnonymous: boolean }; progress: Progress };

const answerOf = (questionId: string) => allQuestions.find((q) => q.id === questionId)!.answer;
const awardOf = (phone: TestPhone) => phone.messages.find((m): m is Extract<ServerMessage, { type: "award" }> => m.type === "award")?.award;

describe("accounts", () => {
  it("gives a guest a profile, and keeps its progress when the guest signs up", async () => {
    const token = await guest();
    expect((await me(token)).user.isAnonymous).toBe(true);
    const solo = await post("/api/progress/solo", { correct: 8, total: 10, score: 80 }, token);
    const { award } = (await solo.json()) as { award: Award };
    expect(award.xp).toBeGreaterThan(0);

    const account = await signUp(token, "Chioma");
    const after = await me(account);
    expect(after.user).toMatchObject({ name: "Chioma", isAnonymous: false });
    expect(after.progress.xp).toBe(award.xp);
    expect((await get("/api/me", token)).status).toBe(401); // the guest session ended with the guest
  });

  it("checks solo results and how often they come", async () => {
    const token = await guest();
    expect((await post("/api/progress/solo", { correct: 9, total: 10, score: 100 }, token)).status).toBe(400);
    expect((await post("/api/progress/solo", { correct: 9, total: 10, score: 90 }, token)).status).toBe(200);
    expect((await post("/api/progress/solo", { correct: 9, total: 10, score: 90 }, token)).status).toBe(429);
    expect((await post("/api/progress/solo", { correct: 9, total: 10, score: 90 })).status).toBe(401);
  });

  it("saves a finished match for everyone with a profile, and puts signed-up winners on the leaderboard", async () => {
    const adaToken = await signUp(await guest(), "Ada");
    const bayoToken = await guest();
    const code = ((await (await post("/rooms", {})).json()) as { code: string }).code;
    const ada = new TestPhone({ port: server.port, code, id: "ada", token: adaToken });
    await ada.until(() => ada.view?.players.length === 1);
    const bayo = new TestPhone({ port: server.port, code, id: "bayo", token: bayoToken });
    await ada.until(() => ada.view?.startProblem === null); // seated on separate teams on joining
    ada.act({ type: "start" });

    // Ada always answers right and Bayo always wrong; Ada (host) moves on after each reveal.
    for (let i = 0; ; i++) {
      const q = await ada.until(() => {
        const m = ada.view?.match as TriviaView | undefined;
        return m && (m.phase === "finished" || (m.phase === "question" && m.index === i)) && m;
      });
      if (q.phase === "finished") break;
      const right = answerOf(q.question!.id);
      ada.act({ type: "mode", action: { type: "lock", option: right } });
      bayo.act({ type: "mode", action: { type: "lock", option: q.question!.options.find((o) => o !== right)! } });
      await ada.until(() => (ada.view?.match as TriviaView | undefined)?.phase === "reveal");
      ada.act({ type: "mode", action: { type: "next" } });
    }

    const adaAward = await ada.until(() => awardOf(ada));
    const bayoAward = await bayo.until(() => awardOf(bayo));
    expect(adaAward).toMatchObject({ counted: true, won: true, ranked: null });
    expect(adaAward.newBadges).toContain("first_win");
    expect(bayoAward).toMatchObject({ counted: true, won: false });

    expect((await me(adaToken)).progress.modes.trivia).toMatchObject({ played: 1, wins: 1 });
    expect((await me(bayoToken)).progress.modes.trivia).toMatchObject({ played: 1, wins: 0 });

    const board = (await (await get("/api/leaderboard?mode=trivia&by=wins")).json()) as { rows: { name: string; wins: number }[] };
    expect(board.rows).toContainEqual(expect.objectContaining({ name: "Ada", wins: 1 }));
    expect(board.rows.map((r) => r.name)).not.toContain("Guest"); // guests stay off leaderboards
    ada.ws.close();
    bayo.ws.close();
  });

  it("keeps ranked play for signed-up players", async () => {
    expect((await post("/quickplay", { queue: "ranked-trivia" })).status).toBe(401);
    const guestToken = await guest();
    expect((await post("/quickplay", { queue: "ranked-trivia" }, guestToken)).status).toBe(401);

    const account = await signUp(await guest(), "Emeka");
    const res = await post("/quickplay", { queue: "ranked-trivia" }, account);
    expect(res.status).toBe(200);
    const { code } = (await res.json()) as { code: string };

    const player = new TestPhone({ port: server.port, code, id: "emeka", token: account });
    await player.until(() => player.view?.ranked === true);
    const sneaky = new TestPhone({ port: server.port, code, id: "sneaky", token: guestToken });
    await sneaky.until(() => sneaky.messages.some((m) => m.type === "error" && m.error === "sign_in_required"));
    const twin = new TestPhone({ port: server.port, code, id: "emeka-2", token: account });
    await twin.until(() => twin.messages.some((m) => m.type === "error" && m.error === "account_in_use"));
    player.ws.close();
  });

  it("checks leaderboard requests", async () => {
    expect((await get("/api/leaderboard?mode=solo")).status).toBe(400);
    expect((await get("/api/leaderboard?mode=sort-am&by=rank")).status).toBe(200);
  });
});
