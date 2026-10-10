import type { PlayerId, PlayerMatchStats } from "./types";

export type StatsTable = Record<PlayerId, PlayerMatchStats>;

/** Adds `by` to one counter of one player's match stats, returning a new table. */
export function bumpStat(stats: StatsTable, playerId: PlayerId, key: keyof PlayerMatchStats, by = 1): StatsTable {
  const mine = stats[playerId] ?? {};
  return { ...stats, [playerId]: { ...mine, [key]: (mine[key] ?? 0) + by } };
}
