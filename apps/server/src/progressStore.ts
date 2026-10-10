import type { Pool } from "pg";
import { mergeProgress, normalizeProgress, type Progress, type ProgressModeId } from "@naija/game/progress/progress";

/**
 * Where players' progress lives. One JSON document per user, so new stats need no migration.
 * Postgres in production; in memory for development and tests (lost on restart).
 */

export type LeaderboardBy = "wins" | "rank";

export interface LeaderRow {
  userId: string;
  name: string;
  played: number;
  wins: number;
  /** Visible rank (0 = JJC 1) and RR; null when unranked or in placements. */
  rank: number | null;
  rr: number;
}

export interface ProgressStore {
  get(userId: string): Promise<Progress>;
  /** Reads these users' progress, lets `apply` change it, and saves it, all-or-nothing. */
  update(userIds: string[], apply: (current: Record<string, Progress>) => Record<string, Progress>): Promise<void>;
  /** Adds one user's progress into another's and removes the first (a guest signing up or in). */
  merge(fromUserId: string, intoUserId: string): Promise<void>;
  /** Signed-up players only (guests are left out), best first. */
  leaderboard(mode: ProgressModeId, by: LeaderboardBy, limit: number): Promise<LeaderRow[]>;
}

function toRow(userId: string, name: string, progress: Progress, mode: ProgressModeId): LeaderRow {
  const record = progress.modes[mode];
  return {
    userId,
    name,
    played: record?.played ?? 0,
    wins: record?.wins ?? 0,
    rank: record?.ranked?.rank ?? null,
    rr: record?.ranked?.rr ?? 0,
  };
}

/** Wins first; ties broken by fewer games. By rank: rank, then RR, then wins. */
export function compareRows(by: LeaderboardBy) {
  return (a: LeaderRow, b: LeaderRow) =>
    by === "rank"
      ? (b.rank ?? -1) - (a.rank ?? -1) || b.rr - a.rr || b.wins - a.wins
      : b.wins - a.wins || a.played - b.played;
}

const qualifies = (row: LeaderRow, by: LeaderboardBy) => (by === "rank" ? row.rank !== null : row.wins > 0);

export function memoryProgressStore(users: () => { id: string; name: string; isAnonymous?: boolean | null }[]): ProgressStore {
  const saved = new Map<string, Progress>();
  return {
    async get(userId) {
      return normalizeProgress(saved.get(userId));
    },
    async update(userIds, apply) {
      const current = Object.fromEntries(userIds.map((id) => [id, normalizeProgress(saved.get(id))]));
      for (const [id, progress] of Object.entries(apply(current))) saved.set(id, progress);
    },
    async merge(from, into) {
      const guest = saved.get(from);
      if (!guest) return;
      saved.set(into, mergeProgress(normalizeProgress(saved.get(into)), guest));
      saved.delete(from);
    },
    async leaderboard(mode, by, limit) {
      return users()
        .filter((u) => !u.isAnonymous && saved.has(u.id))
        .map((u) => toRow(u.id, u.name, saved.get(u.id)!, mode))
        .filter((row) => qualifies(row, by))
        .sort(compareRows(by))
        .slice(0, limit);
    },
  };
}

/**
 * Postgres: table `player_progress` next to Better Auth's tables. Rows go when their user is
 * deleted (a guest's row is merged first, then Better Auth deletes the guest).
 */
export async function postgresProgressStore(pool: Pool): Promise<ProgressStore> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_progress (
      user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);

  async function inTransaction<T>(work: (q: Pool["query"]) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const out = await work(client.query.bind(client) as Pool["query"]);
      await client.query("COMMIT");
      return out;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const save = (q: Pool["query"], userId: string, progress: Progress) =>
    q(
      `INSERT INTO player_progress (user_id, data, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = now()`,
      [userId, JSON.stringify(progress)],
    );

  return {
    async get(userId) {
      const { rows } = await pool.query<{ data: Progress }>("SELECT data FROM player_progress WHERE user_id = $1", [userId]);
      return normalizeProgress(rows[0]?.data);
    },

    async update(userIds, apply) {
      if (userIds.length === 0) return;
      await inTransaction(async (q) => {
        // Rows that don't exist yet can't be locked; create them first (in id order, so two
        // matches finishing at once can't deadlock), then lock them all.
        const ids = [...new Set(userIds)].sort();
        await q(
          `INSERT INTO player_progress (user_id, data) SELECT id, '{}'::jsonb FROM unnest($1::text[]) AS id
           ON CONFLICT (user_id) DO NOTHING`,
          [ids],
        );
        const { rows } = await q<{ user_id: string; data: Progress }>(
          "SELECT user_id, data FROM player_progress WHERE user_id = ANY($1) ORDER BY user_id FOR UPDATE",
          [ids],
        );
        const current = Object.fromEntries(ids.map((id) => [id, normalizeProgress(rows.find((r) => r.user_id === id)?.data)]));
        for (const [id, progress] of Object.entries(apply(current))) await save(q, id, progress);
      });
    },

    async merge(from, into) {
      await inTransaction(async (q) => {
        const { rows } = await q<{ user_id: string; data: Progress }>(
          "SELECT user_id, data FROM player_progress WHERE user_id = ANY($1) ORDER BY user_id FOR UPDATE",
          [[from, into].sort()],
        );
        const guest = rows.find((r) => r.user_id === from);
        if (!guest) return;
        const account = normalizeProgress(rows.find((r) => r.user_id === into)?.data);
        await save(q, into, mergeProgress(account, normalizeProgress(guest.data)));
        await q("DELETE FROM player_progress WHERE user_id = $1", [from]);
      });
    },

    async leaderboard(mode, by, limit) {
      const record = `p.data->'modes'->$1`;
      const order =
        by === "rank"
          ? `(${record}->'ranked'->>'rank')::int DESC, (${record}->'ranked'->>'rr')::int DESC, (${record}->>'wins')::int DESC`
          : `(${record}->>'wins')::int DESC, (${record}->>'played')::int ASC`;
      const where = by === "rank" ? `(${record}->'ranked'->>'rank') IS NOT NULL` : `(${record}->>'wins')::int > 0`;
      const { rows } = await pool.query<{ id: string; name: string; data: Progress }>(
        `SELECT u.id, u.name, p.data FROM player_progress p JOIN "user" u ON u.id = p.user_id
         WHERE NOT COALESCE(u."isAnonymous", false) AND ${where}
         ORDER BY ${order} LIMIT $2`,
        [mode, limit],
      );
      return rows.map((r) => toRow(r.id, r.name, normalizeProgress(r.data), mode));
    },
  };
}
