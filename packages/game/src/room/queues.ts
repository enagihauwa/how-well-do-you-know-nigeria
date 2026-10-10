import type { PublicRoomOptions } from "./engine";

/** Quick Play queues, shared by the room server and the local test mode. */
export type QueueId = "solo" | "squads";

export const QUEUES: Record<QueueId, PublicRoomOptions> = {
  // Battle royale for everyone. Bots fill the room if 6 people haven't turned up within 20s.
  solo: { mode: "battle-royale", minPlayers: 6, maxPlayers: 50, countdownMs: 25_000, squadSize: null, botFillMs: 20_000 },
  // Squads of three; at least three squads.
  squads: { mode: "battle-royale", minPlayers: 9, maxPlayers: 48, countdownMs: 25_000, squadSize: 3, botFillMs: 20_000 },
};

export const isQueueId = (v: unknown): v is QueueId => v === "solo" || v === "squads";
