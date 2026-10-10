import type { ModeId } from "@naija/game/modes/types";
import { generateRoomCode } from "@naija/game/room/code";
import { createPublicRoom, createRoom } from "@naija/game/room/engine";
import { getPlayerId, getPlayerSecret } from "./identity";
import { connectLocalRoom, hostLocalRoom } from "./localTransport";
import type { RoomConnection } from "@naija/game/room/protocol";
import { connectWsRoom } from "./wsTransport";

/**
 * Chooses the transport. With NEXT_PUBLIC_ROOM_SERVER_URL set (every deployment), rooms live on
 * the real server and work across phones. Without it (local development only), the
 * BroadcastChannel transport runs rooms between tabs on one device.
 */
export const ROOM_SERVER_URL = process.env.NEXT_PUBLIC_ROOM_SERVER_URL ?? "";
export const usingLocalRooms = ROOM_SERVER_URL === "";

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

/** Finds (or opens) a public room for this queue and returns its code. Needs the room server. */
export async function quickPlayCode(queue: QueueId): Promise<string> {
  if (usingLocalRooms) {
    // Test mode: this tab hosts the public room. Bots fill it quickly, so one person can play.
    const code = generateRoomCode();
    hostLocalRoom(createPublicRoom(code, { ...QUEUES[queue], botFillMs: LOCAL_BOT_FILL_MS }));
    return code;
  }
  const res = await fetch(`${ROOM_SERVER_URL.replace(/\/$/, "")}/quickplay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ queue }),
  });
  if (!res.ok) throw new Error(`Room server answered ${res.status}`);
  return ((await res.json()) as { code: string }).code;
}

export function connectRoom(code: string, name: string): RoomConnection {
  const playerId = getPlayerId();
  if (usingLocalRooms) return connectLocalRoom({ code, playerId, name });
  return connectWsRoom({ serverUrl: ROOM_SERVER_URL, code, playerId, secret: getPlayerSecret(), name });
}
