import type { ModeId } from "../modes/types";
import type { PublicRoomOptions } from "./engine";

/** Quick Play queues, shared by the room server and the local test mode. */
export type RankedQueueId = "ranked-trivia" | "ranked-guess-the-year" | "ranked-sort-am" | "ranked-battle-royale";
export type QueueId = "solo" | "squads" | RankedQueueId;

/**
 * Ranked queues are every player for themselves, never get bots, and need a signed-up account.
 * Two people are enough to start, so a ranked match can happen while the player base is small.
 */
const ranked = (mode: ModeId, maxPlayers: number): PublicRoomOptions => ({
  mode,
  ranked: true,
  minPlayers: 2,
  maxPlayers,
  countdownMs: 20_000,
  squadSize: null,
  botFillMs: null,
});

export const QUEUES: Record<QueueId, PublicRoomOptions> = {
  // Battle royale for everyone. Bots fill the room if 6 people haven't turned up within 20s.
  solo: { mode: "battle-royale", minPlayers: 6, maxPlayers: 50, countdownMs: 25_000, squadSize: null, botFillMs: 20_000 },
  // Squads of three; at least three squads.
  squads: { mode: "battle-royale", minPlayers: 9, maxPlayers: 48, countdownMs: 25_000, squadSize: 3, botFillMs: 20_000 },
  "ranked-trivia": ranked("trivia", 8),
  "ranked-guess-the-year": ranked("guess-the-year", 8),
  "ranked-sort-am": ranked("sort-am", 8),
  "ranked-battle-royale": ranked("battle-royale", 20),
};

export const QUEUE_IDS = Object.keys(QUEUES) as QueueId[];
export const RANKED_QUEUES = QUEUE_IDS.filter((id): id is RankedQueueId => !!QUEUES[id].ranked);
export const isQueueId = (v: unknown): v is QueueId => QUEUE_IDS.includes(v as QueueId);
export const rankedQueueFor = (mode: ModeId): RankedQueueId | null =>
  RANKED_QUEUES.find((id) => QUEUES[id].mode === mode) ?? null;
