import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocketServer, type WebSocket } from "ws";
import { isPrivateModeId, type ModeContent } from "@naija/game/modes";
import type { ModeId } from "@naija/game/modes/types";
import { generateRoomCode, isRoomCode, normalizeRoomCode } from "@naija/game/room/code";
import { createPublicRoom, createRoom, type PublicRoomOptions, type RoomState } from "@naija/game/room/engine";
import { RoomHost } from "@naija/game/room/host";
import { CLOSE_BAD_SECRET, CLOSE_REPLACED, CLOSE_ROOM_NOT_FOUND, type ServerMessage } from "@naija/game/room/protocol";
import { QUEUES as DEFAULT_QUEUES, isQueueId, type QueueId } from "@naija/game/room/queues";
import { parseClientMessage } from "@naija/game/room/validate";

/**
 * The real-time room server. One process holds every open room in memory: the room engine is
 * single-threaded per room by construction (Node runs one event at a time), so answer locks,
 * deadlines and scores need no locks or Redis. Rooms are lost on restart; players see
 * "reconnecting" and then "room not found". Persisting finished matches to Postgres comes next.
 *
 *   POST /rooms {mode?}       → { code }   create a private room, opening on that game
 *   POST /quickplay {queue}   → { code }   a public room for that queue, filling or new
 *   GET  /health              → ok
 *   WS   /rooms/:code         → hello, then actions; the server sends ServerMessage
 */

export interface RoomServerOptions {
  port: number;
  content: ModeContent;
  /** Origins allowed to create rooms and connect, e.g. https://naijaquiz.app. Empty: any. */
  allowedOrigins?: string[];
  /** A room with nobody connected is deleted after this long. */
  idleMs?: number;
  heartbeatMs?: number;
  log?: (message: string) => void;
  /** Overrides for the Quick Play queues, e.g. a lower minimum while testing. */
  queues?: Partial<Record<QueueId, Partial<PublicRoomOptions>>>;
  /** Called once when a public match ends: where ratings get saved once accounts exist. */
  onPublicMatchFinished?: (room: RoomState) => void;
}


const MAX_ROOMS = 5000;
const MAX_FRAME_BYTES = 4096;
/** Per connection: more messages than this in the window closes the socket. */
const FLOOD_LIMIT = 40;
const FLOOD_WINDOW_MS = 5000;

interface OpenRoom {
  host: RoomHost;
  queue: QueueId | null;
  reported: boolean;
  /** One live socket per player; a new connection replaces the old one. */
  sockets: Map<string, WebSocket>;
  /** Proves seat ownership: the first hello for a player id binds its secret. */
  secrets: Map<string, string>;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function startRoomServer(options: RoomServerOptions) {
  const { content, allowedOrigins = [], idleMs = 10 * 60_000, heartbeatMs = 20_000, log = () => {} } = options;
  const rooms = new Map<string, OpenRoom>();
  const queues = Object.fromEntries(
    (Object.keys(DEFAULT_QUEUES) as QueueId[]).map((id) => [id, { ...DEFAULT_QUEUES[id], ...options.queues?.[id] }]),
  ) as Record<QueueId, PublicRoomOptions>;

  const originAllowed = (origin: string | undefined) =>
    allowedOrigins.length === 0 || (origin !== undefined && allowedOrigins.includes(origin));

  const cors = (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin;
    if (origin && originAllowed(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
    }
  };

  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  function openRoom(code: string, queue: QueueId | null = null, mode?: ModeId): OpenRoom {
    const room: OpenRoom = {
      host: null as unknown as RoomHost,
      queue,
      reported: false,
      sockets: new Map(),
      secrets: new Map(),
      idleTimer: null,
    };
    room.host = new RoomHost(queue ? createPublicRoom(code, queues[queue]) : createRoom(code, mode), {
      content,
      send: (to, message) => sendTo(room, to, message),
      persist: (state) => {
        if (queue && state.status === "finished" && !room.reported) {
          room.reported = true;
          options.onPublicMatchFinished?.(state);
        }
      },
    });
    rooms.set(code, room);
    scheduleIdle(code, room);
    return room;
  }

  function sendTo(room: OpenRoom, playerId: string, message: ServerMessage) {
    const socket = room.sockets.get(playerId);
    if (socket && socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  }

  function scheduleIdle(code: string, room: OpenRoom) {
    if (room.idleTimer) clearTimeout(room.idleTimer);
    room.idleTimer = setTimeout(() => {
      if (room.sockets.size > 0) return;
      room.host.dispose();
      rooms.delete(code);
      log(`room ${code} closed (idle)`);
    }, idleMs);
  }

  function newCode(): string | null {
    let code = generateRoomCode();
    for (let i = 0; rooms.has(code) && i < 20; i++) code = generateRoomCode();
    return rooms.has(code) ? null : code;
  }

  /** The fullest public room of this queue still filling, so matches start as soon as possible. */
  function findOrOpenPublic(queue: QueueId): string | null {
    let best: [string, number] | null = null;
    for (const [code, room] of rooms) {
      const state = room.host.room;
      if (room.queue !== queue || state.status !== "lobby" || state.players.length >= state.maxPlayers) continue;
      if (!best || state.players.length > best[1]) best = [code, state.players.length];
    }
    if (best) return best[0];
    const code = newCode();
    if (code) openRoom(code, queue);
    return code;
  }

  function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1024) reject(new Error("too large"));
      });
      req.on("end", () => resolve(body));
      req.on("error", reject);
    });
  }

  const server = createServer(async (req, res) => {
    cors(req, res);
    if (req.method === "OPTIONS") return void res.writeHead(204).end();
    if (req.method === "GET" && req.url === "/health") return json(res, 200, { ok: true, rooms: rooms.size });
    if (req.method === "POST" && req.url === "/rooms") {
      if (!originAllowed(req.headers.origin)) return json(res, 403, { error: "origin" });
      let mode: unknown;
      try {
        const body = await readBody(req);
        mode = body ? (JSON.parse(body) as { mode?: unknown }).mode : undefined;
      } catch {
        return json(res, 400, { error: "bad_request" });
      }
      if (mode !== undefined && !isPrivateModeId(mode)) return json(res, 400, { error: "bad_mode" });
      if (rooms.size >= MAX_ROOMS) return json(res, 503, { error: "busy" });
      const code = newCode();
      if (!code) return json(res, 503, { error: "busy" });
      openRoom(code, null, mode);
      log(`room ${code} created${mode ? ` (${mode})` : ""}`);
      return json(res, 201, { code });
    }
    if (req.method === "POST" && req.url === "/quickplay") {
      if (!originAllowed(req.headers.origin)) return json(res, 403, { error: "origin" });
      let queue: unknown;
      try {
        queue = (JSON.parse(await readBody(req)) as { queue?: unknown }).queue;
      } catch {
        return json(res, 400, { error: "bad_request" });
      }
      if (!isQueueId(queue)) return json(res, 400, { error: "bad_queue" });
      if (rooms.size >= MAX_ROOMS) return json(res, 503, { error: "busy" });
      const code = findOrOpenPublic(queue);
      return code ? json(res, 200, { code }) : json(res, 503, { error: "busy" });
    }
    json(res, 404, { error: "not_found" });
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });

  server.on("upgrade", (req, socket, head) => {
    const match = req.url?.match(/^\/rooms\/([A-Za-z0-9-]+)$/);
    if (!match || !originAllowed(req.headers.origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      return socket.destroy();
    }
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, normalizeRoomCode(match[1])));
  });

  function onConnection(ws: WebSocket, code: string) {
    const room = isRoomCode(code) ? rooms.get(code) : undefined;
    if (!room) {
      ws.send(JSON.stringify({ type: "error", error: "room_not_found" } satisfies ServerMessage));
      return ws.close(CLOSE_ROOM_NOT_FOUND, "room_not_found");
    }

    let playerId: string | null = null;
    let alive = true;
    let windowStart = Date.now();
    let count = 0;
    const connectionId = randomUUID();
    log(`connection ${connectionId.slice(0, 8)} → ${code}`);

    ws.on("pong", () => (alive = true));
    const heartbeat = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      ws.ping();
    }, heartbeatMs);

    ws.on("message", (data) => {
      const now = Date.now();
      if (now - windowStart > FLOOD_WINDOW_MS) {
        windowStart = now;
        count = 0;
      }
      if (++count > FLOOD_LIMIT) return ws.close(1008, "too_many_messages");

      const message = parseClientMessage(data.toString());
      if (!message) return;

      if (message.type === "hello") {
        if (playerId) return; // one hello per connection
        const known = room.secrets.get(message.playerId);
        if (known && !sameSecret(known, message.secret)) return ws.close(CLOSE_BAD_SECRET, "bad_secret");
        room.secrets.set(message.playerId, message.secret);
        playerId = message.playerId;
        const previous = room.sockets.get(playerId);
        if (previous && previous !== ws) previous.close(CLOSE_REPLACED, "replaced");
        room.sockets.set(playerId, ws);
        if (room.idleTimer) clearTimeout(room.idleTimer);
        room.host.handle(playerId, { type: "join", name: message.name });
        return;
      }

      if (!playerId) return; // actions only after hello
      room.host.handle(playerId, message.action);
    });

    ws.on("close", (closeCode, reason) => {
      clearInterval(heartbeat);
      log(`connection ${connectionId.slice(0, 8)} closed (${closeCode} ${reason.toString()}) player ${playerId?.slice(0, 8) ?? "-"}`);
      if (!playerId || room.sockets.get(playerId) !== ws) return;
      room.sockets.delete(playerId);
      room.host.disconnect(playerId);
      if (room.sockets.size === 0) scheduleIdle(code, room);
    });
  }

  return new Promise<{ port: number; close: () => Promise<void>; rooms: () => number }>((resolve) => {
    server.listen(options.port, () => {
      const { port } = server.address() as AddressInfo;
      log(`room server listening on :${port}`);
      resolve({
        port,
        rooms: () => rooms.size,
        close: () =>
          new Promise<void>((done) => {
            for (const room of rooms.values()) {
              room.host.dispose();
              if (room.idleTimer) clearTimeout(room.idleTimer);
              for (const ws of room.sockets.values()) ws.terminate();
            }
            rooms.clear();
            wss.close();
            server.close(() => done());
          }),
      });
    });
  });
}
