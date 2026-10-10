import type { ModeId } from "@naija/game/modes/types";
import { generateRoomCode } from "@naija/game/room/code";
import { createPublicRoom, createRoom } from "@naija/game/room/engine";
import { getPlayerId, getPlayerSecret } from "./identity";
import { connectLocalRoom, hostLocalRoom } from "./localTransport";
import type { RoomConnection } from "@naija/game/room/protocol";
import { ensureSession, getToken } from "@/lib/account/account";
import { ROOM_SERVER_URL, usingLocalRooms } from "./serverUrl";
import { connectWsRoom } from "./wsTransport";

/** Chooses the transport: the room server when one is configured, else tabs on this device. */
export { ROOM_SERVER_URL, usingLocalRooms };

/** Creates a private room that opens on `mode` (default: trivia) and returns its code. */
export async function createRoomCode(mode?: ModeId): Promise<string> {
  if (usingLocalRooms) {
    const code = generateRoomCode();
    hostLocalRoom(createRoom(code, mode));
    return code;
  }
  const res = await fetch(`${ROOM_SERVER_URL.replace(/\/$/, "")}/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(`Room server answered ${res.status}`);
  const { code } = (await res.json()) as { code: string };
  return code;
}

import { QUEUES, type QueueId } from "@naija/game/room/queues";

/** In local test mode there is nobody else to wait for, so bots join after a short pause. */
const LOCAL_BOT_FILL_MS = 5000;
export type { QueueId };

/** Ranked queues answer this when the player is a guest. */
export class SignInRequired extends Error {}

/** Finds (or opens) a public room for this queue and returns its code. Ranked needs an account. */
export async function quickPlayCode(queue: QueueId): Promise<string> {
  if (usingLocalRooms) {
    // Test mode: this tab hosts the public room. Bots fill it quickly, so one person can play.
    const code = generateRoomCode();
    hostLocalRoom(createPublicRoom(code, { ...QUEUES[queue], botFillMs: LOCAL_BOT_FILL_MS }));
    return code;
  }
  const token = QUEUES[queue].ranked ? getToken() : null;
  const res = await fetch(`${ROOM_SERVER_URL.replace(/\/$/, "")}/quickplay`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ queue }),
  });
  if (res.status === 401) throw new SignInRequired();
  if (!res.ok) throw new Error(`Room server answered ${res.status}`);
  return ((await res.json()) as { code: string }).code;
}

export function connectRoom(code: string, name: string): RoomConnection {
  const playerId = getPlayerId();
  if (usingLocalRooms) return connectLocalRoom({ code, playerId, name });
  // The account token goes in the hello (a guest profile is made first if needed), so the match
  // counts toward this player's progress.
  return connectWsRoom({ serverUrl: ROOM_SERVER_URL, code, playerId, secret: getPlayerSecret(), name, getToken: ensureSession });
}
