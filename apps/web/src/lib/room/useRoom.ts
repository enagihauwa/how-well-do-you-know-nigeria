"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { connectRoom } from "./connect";
import type { ChatMessage, ClientAction, RoomView } from "@naija/game/room/engine";
import { CHAT_HISTORY } from "@naija/game/room/engine";
import type { ConnectionError, RoomConnection, ServerMessage } from "@naija/game/room/protocol";

/** Errors that end this visit to the room, as opposed to a refused action. */
const FATAL: ConnectionError[] = [
  "room_not_found",
  "room_full",
  "already_started",
  "kicked",
  "invalid_name",
  "not_in_room",
  "server_unreachable",
];

export type ConnectionStatus = Extract<ServerMessage, { type: "status" }>["status"];

export interface RoomHandle {
  view: RoomView | null;
  chat: ChatMessage[];
  status: ConnectionStatus;
  fatalError: ConnectionError | null;
  /** The last refused action, e.g. a team that cannot start yet. Cleared by the next view. */
  notice: ConnectionError | null;
  /** Add to Date.now() to get the room's clock. */
  clockOffset: number;
  send: (action: ClientAction) => void;
}

/**
 * Connects to a room while `name` is set. The server only sends a view when it changed, and
 * chat as new messages, so each message here is one cheap state update and one React render.
 */
export function useRoom(code: string, name: string | null): RoomHandle {
  const [view, setView] = useState<RoomView | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [fatalError, setFatalError] = useState<ConnectionError | null>(null);
  const [notice, setNotice] = useState<ConnectionError | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const connection = useRef<RoomConnection | null>(null);

  useEffect(() => {
    if (!name) return;
    const conn = connectRoom(code, name);
    connection.current = conn;
    const unsubscribe = conn.subscribe((message) => {
      switch (message.type) {
        case "view":
          setView(message.view);
          setNotice(null);
          // Only re-render for skew when it moved noticeably; small jitter is invisible.
          setClockOffset((prev) => {
            const next = message.serverNow - Date.now();
            return Math.abs(next - prev) > 250 ? next : prev;
          });
          break;
        case "chat":
          setChat((prev) =>
            message.reset ? message.messages : [...prev, ...message.messages].slice(-CHAT_HISTORY),
          );
          break;
        case "status":
          setStatus(message.status);
          break;
        case "error":
          if (FATAL.includes(message.error)) setFatalError(message.error);
          else setNotice(message.error);
          break;
      }
    });
    return () => {
      unsubscribe();
      conn.close();
      connection.current = null;
    };
  }, [code, name]);

  const send = useCallback((action: ClientAction) => connection.current?.send(action), []);

  return { view, chat, status, fatalError, notice, clockOffset, send };
}
