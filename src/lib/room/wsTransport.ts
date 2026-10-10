import type { ClientAction } from "./engine";
import {
  CLOSE_BAD_SECRET,
  CLOSE_REPLACED,
  CLOSE_ROOM_NOT_FOUND,
  type ClientMessage,
  type RoomConnection,
  type ServerMessage,
} from "./protocol";

/**
 * The real connection: a WebSocket to the room server. Reconnects on its own with backoff after
 * a drop (network change, phone asleep, tunnel), and immediately when the tab comes back to the
 * front or the network returns. Every (re)connect says hello again, so the player keeps their seat.
 */

const BACKOFF_MS = [300, 800, 1500, 3000, 5000];
/** Before the first successful connection, give up after this many tries. */
const FIRST_CONNECT_TRIES = 4;
const MAX_QUEUED = 20;

export interface WsRoomOptions {
  serverUrl: string;
  code: string;
  playerId: string;
  secret: string;
  name: string;
}

export function connectWsRoom({ serverUrl, code, playerId, secret, name }: WsRoomOptions): RoomConnection {
  const url = `${serverUrl.replace(/^http/, "ws").replace(/\/$/, "")}/rooms/${code}`;
  const listeners = new Set<(message: ServerMessage) => void>();
  const queue: ClientAction[] = [];
  let socket: WebSocket | null = null;
  let attempts = 0;
  let everConnected = false;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const emit = (message: ServerMessage) => {
    if (!closed) listeners.forEach((listener) => listener(message));
  };
  const write = (message: ClientMessage) => socket?.send(JSON.stringify(message));

  function open() {
    if (closed) return;
    if (retry) clearTimeout(retry);
    retry = null;
    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
      attempts = 0;
      everConnected = true;
      write({ type: "hello", playerId, secret, name });
      while (queue.length) write({ type: "action", action: queue.shift()! });
      emit({ type: "status", status: "connected" });
    };

    ws.onmessage = (event) => {
      try {
        emit(JSON.parse(event.data as string) as ServerMessage);
      } catch {
        // Ignore a frame we cannot read; the next view replaces it.
      }
    };

    ws.onclose = (event) => {
      if (socket !== ws || closed) return;
      socket = null;
      if (event.code === CLOSE_ROOM_NOT_FOUND) return emit({ type: "error", error: "room_not_found" });
      if (event.code === CLOSE_BAD_SECRET) return emit({ type: "error", error: "not_in_room" });
      if (event.code === CLOSE_REPLACED) return emit({ type: "status", status: "closed" });
      if (!everConnected && attempts >= FIRST_CONNECT_TRIES) return emit({ type: "error", error: "server_unreachable" });
      emit({ type: "status", status: everConnected ? "reconnecting" : "connecting" });
      retry = setTimeout(open, BACKOFF_MS[Math.min(attempts++, BACKOFF_MS.length - 1)]);
    };
  }

  // Phones drop sockets while asleep or switching networks; reconnect as soon as it can work.
  const reconnectNow = () => {
    if (closed || document.visibilityState !== "visible") return;
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      attempts = 0;
      open();
    }
  };
  document.addEventListener("visibilitychange", reconnectNow);
  window.addEventListener("online", reconnectNow);

  queueMicrotask(open);

  return {
    send(action) {
      if (socket?.readyState === WebSocket.OPEN) write({ type: "action", action });
      else if (queue.length < MAX_QUEUED) queue.push(action);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      closed = true;
      if (retry) clearTimeout(retry);
      document.removeEventListener("visibilitychange", reconnectNow);
      window.removeEventListener("online", reconnectNow);
      socket?.close(1000, "bye");
      socket = null;
    },
  };
}
