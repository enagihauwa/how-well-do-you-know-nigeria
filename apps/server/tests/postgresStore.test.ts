import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyProgress, settleSolo } from "@naija/game/progress/progress";
import { createAccounts, type Accounts } from "../src/accounts";

/**
 * The Postgres store against a real database. Skipped unless TEST_DATABASE_URL is set, e.g.
 * TEST_DATABASE_URL=postgres://localhost/naija_trivia_test npm test
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("progress in Postgres", () => {
  let accounts: Accounts;
  const call = async (path: string, body: unknown, token?: string) => {
    const res = await accounts.handler(
      new Request(`http://localhost/api/auth${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", ...(token && { authorization: `Bearer ${token}` }) },
        body: JSON.stringify(body),
      }),
    );
    return res.headers.get("set-auth-token")!;
  };
  const userId = async (token: string) => (await accounts.userFromToken(token))!.id;

  beforeAll(async () => {
    accounts = await createAccounts({ databaseUrl: url, secret: "test-secret-test-secret-test-secret-123", baseURL: "http://localhost", allowedOrigins: [] });
  });
  afterAll(() => accounts?.close());

  it("saves, merges a guest into an account, and ranks signed-up players only", async () => {
    const guestToken = await call("/sign-in/anonymous", {});
    const guestId = await userId(guestToken);
    await accounts.progress.update([guestId], (cur) => ({ [guestId]: settleSolo(cur[guestId], { correct: 10, total: 10, score: 100 }, Date.now()).progress }));
    const guestXp = (await accounts.progress.get(guestId)).xp;
    expect(guestXp).toBeGreaterThan(0);

    const accountToken = await call("/sign-up/email", { email: `pg${Date.now()}@example.com`, password: "a good password", name: "Funke" }, guestToken);
    const accountId = await userId(accountToken);
    expect((await accounts.progress.get(accountId)).xp).toBe(guestXp);
    expect(await accounts.userFromToken(guestToken)).toBeNull();

    // Two concurrent updates to the same row both land (rows are locked, not overwritten).
    const win = (p: ReturnType<typeof emptyProgress>) => ({ ...p, modes: { ...p.modes, "sort-am": { played: (p.modes["sort-am"]?.played ?? 0) + 1, wins: (p.modes["sort-am"]?.wins ?? 0) + 1, practice: 0, best: 20 } } });
    await Promise.all([
      accounts.progress.update([accountId], (cur) => ({ [accountId]: win(cur[accountId]) })),
      accounts.progress.update([accountId], (cur) => ({ [accountId]: win(cur[accountId]) })),
    ]);
    expect((await accounts.progress.get(accountId)).modes["sort-am"]?.wins).toBe(2);

    const otherGuest = await userId(await call("/sign-in/anonymous", {}));
    await accounts.progress.update([otherGuest], (cur) => ({ [otherGuest]: win(cur[otherGuest]) }));
    const rows = await accounts.progress.leaderboard("sort-am", "wins", 100);
    expect(rows.find((r) => r.userId === accountId)).toMatchObject({ name: "Funke", wins: 2 });
    expect(rows.find((r) => r.userId === otherGuest)).toBeUndefined();
  });
});
