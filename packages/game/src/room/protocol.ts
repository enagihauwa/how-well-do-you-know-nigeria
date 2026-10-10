import type { Award } from "../progress/progress";
import type { ChatMessage, ClientAction, RoomError, RoomView } from "./engine";

/**
 * What travels between a phone and the room. The WebSocket server and the local development
 * transport both speak exactly this, so the UI does not know which one it is using.
 */

export type ConnectionError =
  | RoomError
  | "room_not_found"
  | "server_unreachable"
  /** Ranked rooms need a signed-up account. */
  | "sign_in_required"
  /** Ranked rooms take each account once, so nobody plays two seats. */
  | "account_in_use";

export type ServerMessage =
  /** This player's view of the room, sent only when it changed. `serverNow` corrects clock skew. */
  | { type: "view"; view: RoomView; serverNow: number }
  /** New chat messages. `reset`: replace what the phone has (on join or rejoin). */
  | { type: "chat"; messages: ChatMessage[]; reset: boolean }
  | { type: "error"; error: ConnectionError }
  /** After a match: what this player earned (XP, badges, RR). Only with an account or guest profile. */
  | { type: "award"; award: Award }
  | { type: "status"; status: "connecting" | "connected" | "reconnecting" | "closed" };

/** Phone → server over the WebSocket. */
export type ClientMessage =
  /** First message on every connection. `secret` proves this phone owns the seat. */
  | { type: "hello"; playerId: string; secret: string; name: string; token?: string }
  | { type: "action"; action: ClientAction };

export interface RoomConnection {
  send(action: ClientAction): void;
  subscribe(listener: (message: ServerMessage) => void): () => void;
  close(): void;
}

/** WebSocket close codes the server uses, so the phone knows whether to retry. */
export const CLOSE_ROOM_NOT_FOUND = 4004;
export const CLOSE_REPLACED = 4001;
export const CLOSE_BAD_SECRET = 4003;
