import { noTalkAmCards } from "@/data/noTalkAmCards";
import { allQuestions } from "@/data/questions";
import { sortItems } from "@/data/sortItems";
import { yearItems } from "@/data/yearItems";
import type { ClientAction, RoomState } from "./engine";
import { RoomHost } from "./host";
import type { RoomConnection, ServerMessage } from "./protocol";

/**
 * DEVELOPMENT ONLY. Runs a room without a backend: the tab that created the room runs the room
 * engine and the other tabs on the same device talk to it over BroadcastChannel. It exists so the
 * lobby and match UI can be built before the backend room server. It is not secure (the host tab
 * holds the answers) and it cannot reach other devices. The backend replaces it with a WebSocket
 * that sends the same `ServerMessage`s.
 */

type Wire =
  | { kind: "action"; from: string; action: ClientAction }
  | { kind: "presence"; from: string; here: boolean }
  | { kind: "message"; to: string; message: ServerMessage }
  | { kind: "authority" };

const HEARTBEAT_MS = 2000;
/** A tab not heard from for this long is treated as disconnected. */
const SILENCE_MS = 7000;
const FIND_ROOM_MS = 2500;

const channelName = (code: string) => `ng-room:${code}`;
const storageKey = (code: string) => `ng-room:${code}`;

/**
 * Called when a room is created (built with `createRoom`/`createPublicRoom`, as the server does),
 * so the next page load of /room/CODE in this tab runs the room.
 */
export function hostLocalRoom(room: RoomState) {
  sessionStorage.setItem(storageKey(room.code), JSON.stringify(room));
}

function loadHostedRoom(code: string): RoomState | null {
  try {
    const saved = sessionStorage.getItem(storageKey(code));
    return saved ? (JSON.parse(saved) as RoomState) : null;
  } catch {
    return null;
  }
}

const CONTENT = { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems };

export function connectLocalRoom(options: { code: string; playerId: string; name: string }): RoomConnection {
  const { code, playerId, name } = options;
  const channel = new BroadcastChannel(channelName(code));
  const listeners = new Set<(message: ServerMessage) => void>();
  const timers: ReturnType<typeof setTimeout>[] = [];
  let closed = false;

  const emit = (message: ServerMessage) => {
    if (!closed) listeners.forEach((listener) => listener(message));
  };
  const post = (wire: Wire) => {
    if (!closed) channel.postMessage(wire);
  };
  const every = (ms: number, fn: () => void) => timers.push(setInterval(fn, ms));
  const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

  const hosted = loadHostedRoom(code);

  // ---------- This tab runs the room ----------
  if (hosted) {
    const lastSeen = new Map<string, number>();
    const host = new RoomHost(hosted, {
      content: CONTENT,
      send: (to, message) => {
        if (to === playerId) emit(message);
        else post({ kind: "message", to, message });
      },
      persist: (state) => {
        try {
          sessionStorage.setItem(storageKey(code), JSON.stringify(state));
        } catch {
          // Storage full or blocked: the room still runs, it just won't survive a reload.
        }
      },
    });

    const apply = (from: string, action: ClientAction) => {
      // A closed connection (e.g. Strict Mode's first mount) must not touch the saved room.
      if (closed) return;
      lastSeen.set(from, Date.now());
      host.handle(from, action);
    };

    channel.onmessage = (event: MessageEvent<Wire>) => {
      const wire = event.data;
      if (wire.kind === "action") apply(wire.from, wire.action);
      if (wire.kind === "presence") {
        if (wire.here) lastSeen.set(wire.from, Date.now());
        else if (!closed) host.disconnect(wire.from);
      }
    };

    every(HEARTBEAT_MS, () => {
      post({ kind: "authority" });
      const now = Date.now();
      for (const p of host.room.players) {
        if (p.id !== playerId && p.connected && !p.bot && now - (lastSeen.get(p.id) ?? 0) > SILENCE_MS) host.disconnect(p.id);
      }
    });

    // Everyone already in the room counts as just seen, so a host reload doesn't drop them.
    for (const p of hosted.players) lastSeen.set(p.id, Date.now());
    queueMicrotask(() => {
      if (closed) return;
      emit({ type: "status", status: "connected" });
      post({ kind: "authority" });
      apply(playerId, { type: "join", name });
    });

    return {
      send: (action) => {
        apply(playerId, action);
        if (action.type === "leave") sessionStorage.removeItem(storageKey(code));
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      close: () => {
        closed = true;
        host.dispose();
        timers.forEach(clearTimeout);
        channel.close();
      },
    };
  }

  // ---------- This tab joins a room another tab runs ----------
  let lastHeard = 0;
  let status: "connecting" | "connected" | "reconnecting" = "connecting";
  const setStatus = (next: typeof status) => {
    if (next === status) return;
    status = next;
    emit({ type: "status", status: next });
  };
  const join = () => post({ kind: "action", from: playerId, action: { type: "join", name } });

  channel.onmessage = (event: MessageEvent<Wire>) => {
    const wire = event.data;
    if (wire.kind === "authority" || (wire.kind === "message" && wire.to === playerId)) {
      lastHeard = Date.now();
      // The host tab came back (e.g. after a reload): take our seat again.
      if (status === "reconnecting") join();
      setStatus("connected");
    }
    if (wire.kind === "message" && wire.to === playerId) emit(wire.message);
  };

  const sayBye = () => post({ kind: "presence", from: playerId, here: false });
  window.addEventListener("pagehide", sayBye);

  every(HEARTBEAT_MS, () => {
    post({ kind: "presence", from: playerId, here: true });
    if (status === "connected" && Date.now() - lastHeard > SILENCE_MS) setStatus("reconnecting");
  });
  after(FIND_ROOM_MS, () => {
    if (status === "connecting") emit({ type: "error", error: "room_not_found" });
  });
  queueMicrotask(join);

  return {
    send: (action) => post({ kind: "action", from: playerId, action }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: () => {
      sayBye();
      closed = true;
      timers.forEach(clearTimeout);
      window.removeEventListener("pagehide", sayBye);
      channel.close();
    },
  };
}
