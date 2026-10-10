import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { toNodeHandler } from "better-auth/node";
import { WebSocketServer, type WebSocket } from "ws";
import { isPrivateModeId, type ModeContent } from "@naija/game/modes";
import type { MatchSummary, ModeId } from "@naija/game/modes/types";
import { isValidSoloResult, RANKED_MODES, settleMatch, settleSolo, type Award } from "@naija/game/progress/progress";
import { generateRoomCode, isRoomCode, normalizeRoomCode } from "@naija/game/room/code";
import { createPublicRoom, createRoom, type PublicRoomOptions, type RoomState } from "@naija/game/room/engine";
import { RoomHost } from "@naija/game/room/host";
import { CLOSE_BAD_SECRET, CLOSE_REPLACED, CLOSE_ROOM_NOT_FOUND, type ServerMessage } from "@naija/game/room/protocol";
import { QUEUES as DEFAULT_QUEUES, isQueueId, type QueueId } from "@naija/game/room/queues";
import { matchResult } from "@naija/game/room/results";
import { parseClientMessage } from "@naija/game/room/validate";
import { AUTH_BASE_PATH, type AccountUser, type Accounts } from "./accounts";

/**
 * The real-time room server. One process holds every open room in memory: the room engine is
 * single-threaded per room by construction (Node runs one event at a time), so answer locks,
 * deadlines and scores need no locks or Redis. Rooms are lost on restart; players see
 * "reconnecting" and then "room not found". Progress (XP, wins, ranks) is saved when a match ends.
 *
 *   POST /rooms {mode?}           → { code }      create a private room, opening on that game
 *   POST /quickplay {queue}       → { code }      a public room for that queue, filling or new;
 *                                                  ranked queues need a signed-up account
 *   GET  /health                  → ok
 *   WS   /rooms/:code             → hello, then actions; the server sends ServerMessage
 *
 * With accounts (bearer token in `Authorization`):
 *   *    /api/auth/*              Better Auth: guest sign-in, sign-up, sign-in, sign-out
 *   GET  /api/me                  → { user, progress }
 *   POST /api/progress/solo {…}   → { award }     a finished solo quiz
 *   GET  /api/leaderboard?mode=&by=wins|rank → { rows }
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
  /** Called once when a public match ends. */
  onPublicMatchFinished?: (room: RoomState) => void;
  /** Accounts and progress. Without them, everyone plays as a guest and nothing is saved. */
  accounts?: Accounts;
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
  /** The account behind each seat that connected with a valid token. */
  users: Map<string, AccountUser>;
  /** The match whose progress was last saved, so each match is saved once. */
  settled: MatchSummary | null;
  /** Ranked rooms: the MMR of each player matched here, to match newcomers of similar skill. */
  mmr: number[];
  openedAt: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

/** Ranked matchmaking: how far apart in MMR players may be, widening the longer a room waits. */
const MMR_WINDOW = 150;
const MMR_WINDOW_GROWTH_PER_S = 10;
/** One solo result per player this often, at most: a real quiz takes longer. */
const SOLO_MIN_INTERVAL_MS = 20_000;
const LEADERBOARD_MAX = 100;

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function startRoomServer(options: RoomServerOptions) {
  const { content, allowedOrigins = [], idleMs = 10 * 60_000, heartbeatMs = 20_000, log = () => {}, accounts } = options;
  const authHandler = accounts ? toNodeHandler(accounts.handler) : null;
  const lastSolo = new Map<string, number>();
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
      res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
      // Sign-in responses carry the new session token in this header (bearer sessions).
      res.setHeader("Access-Control-Expose-Headers", "set-auth-token");
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
      users: new Map(),
      settled: null,
      mmr: [],
      openedAt: Date.now(),
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
        if (state.status === "finished" && state.summary && state.summary !== room.settled) {
          room.settled = state.summary;
          void settle(room, state);
        }
      },
    });
    rooms.set(code, room);
    scheduleIdle(code, room);
    return room;
  }

  /** Saves what everyone with a profile earned in a finished match, then tells each of them. */
  async function settle(room: OpenRoom, state: RoomState) {
    if (!accounts) return;
    const result = matchResult(state);
    const seated = result?.players.filter((p) => !p.bot && room.users.has(p.playerId)) ?? [];
    if (!result || seated.length === 0) return;
    const userOf = (playerId: string) => room.users.get(playerId)!.id;
    const awards: Record<string, Award> = {};
    try {
      await accounts.progress.update(
        seated.map((p) => userOf(p.playerId)),
        (current) => {
          const byPlayer = Object.fromEntries(seated.map((p) => [p.playerId, current[userOf(p.playerId)]]));
          const out: Record<string, (typeof current)[string]> = {};
          for (const [playerId, settled] of Object.entries(settleMatch(result, byPlayer, Date.now()))) {
            out[userOf(playerId)] = settled.progress;
            awards[playerId] = settled.award;
          }
          return out;
        },
      );
    } catch (error) {
      log(`room ${state.code}: saving progress failed: ${String(error)}`);
      return;
    }
    for (const [playerId, award] of Object.entries(awards)) sendTo(room, playerId, { type: "award", award });
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

  /**
   * The public room of this queue to join. Casual: the fullest one still filling, so matches
   * start as soon as possible. Ranked (with `mmr`): the closest in average MMR, within a window
   * that widens the longer the room has waited; otherwise a new room.
   */
  function findOrOpenPublic(queue: QueueId, mmr: number | null = null): string | null {
    let best: { code: string; players: number; gap: number } | null = null;
    const now = Date.now();
    for (const [code, room] of rooms) {
      const state = room.host.room;
      if (room.queue !== queue || state.status !== "lobby" || state.players.length >= state.maxPlayers) continue;
      let gap = 0;
      if (mmr !== null && room.mmr.length) {
        gap = Math.abs(room.mmr.reduce((a, b) => a + b, 0) / room.mmr.length - mmr);
        if (gap > MMR_WINDOW + ((now - room.openedAt) / 1000) * MMR_WINDOW_GROWTH_PER_S) continue;
      }
      const better = !best || (mmr !== null ? gap < best.gap : state.players.length > best.players);
      if (better) best = { code, players: state.players.length, gap };
    }
    let code = best?.code ?? null;
    if (!code) {
      code = newCode();
      if (code) openRoom(code, queue);
    }
    if (code && mmr !== null) rooms.get(code)!.mmr.push(mmr);
    return code;
  }

  const bearer = (req: IncomingMessage) => req.headers.authorization?.replace(/^bearer\s+/i, "") || null;

  /** Account and progress endpoints. Returns false if the request is not one of them. */
  async function handleAccountRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/")) return false;
    if (!accounts || !authHandler) return json(res, 404, { error: "accounts_disabled" }), true;
    if (url.pathname.startsWith(`${AUTH_BASE_PATH}/`)) return await authHandler(req, res), true;

    const user = await accounts.userFromToken(bearer(req));
    if (req.method === "GET" && url.pathname === "/api/me") {
      if (!user) return json(res, 401, { error: "signed_out" }), true;
      return json(res, 200, { user, progress: await accounts.progress.get(user.id) }), true;
    }
    if (req.method === "POST" && url.pathname === "/api/progress/solo") {
      if (!user) return json(res, 401, { error: "signed_out" }), true;
      let body: unknown;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        return json(res, 400, { error: "bad_request" }), true;
      }
      if (!isValidSoloResult(body)) return json(res, 400, { error: "bad_result" }), true;
      const now = Date.now();
      if (now - (lastSolo.get(user.id) ?? 0) < SOLO_MIN_INTERVAL_MS) return json(res, 429, { error: "too_soon" }), true;
      lastSolo.set(user.id, now);
      let award: Award | null = null;
      await accounts.progress.update([user.id], (current) => {
        const settled = settleSolo(current[user.id], body, now);
        award = settled.award;
        return { [user.id]: settled.progress };
      });
      return json(res, 200, { award }), true;
    }
    if (req.method === "GET" && url.pathname === "/api/leaderboard") {
      const mode = url.searchParams.get("mode");
      const by = url.searchParams.get("by") === "rank" ? "rank" : "wins";
      const limit = Math.min(LEADERBOARD_MAX, Math.max(1, Number(url.searchParams.get("limit")) || 50));
      if (!RANKED_MODES.includes(mode as ModeId)) return json(res, 400, { error: "bad_mode" }), true;
      return json(res, 200, { rows: await accounts.progress.leaderboard(mode as ModeId, by, limit) }), true;
    }
    json(res, 404, { error: "not_found" });
    return true;
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
    try {
      if (await handleAccountRoute(req, res)) return;
    } catch (error) {
      log(`${req.method} ${req.url} failed: ${String(error)}`);
      if (!res.headersSent) json(res, 500, { error: "server_error" });
      return;
    }
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
      let mmr: number | null = null;
      if (queues[queue].ranked) {
        const user = accounts ? await accounts.userFromToken(bearer(req)) : null;
        if (!user || user.isAnonymous) return json(res, 401, { error: "sign_in_required" });
        mmr = (await accounts!.progress.get(user.id)).modes[queues[queue].mode]?.ranked?.mmr ?? 1000;
      }
      const code = findOrOpenPublic(queue, mmr);
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
      // Handled in order: the hello may wait on an account lookup, and the actions after it must wait too.
      pending = pending.then(() => onMessage(message)).catch((error) => log(`message failed: ${String(error)}`));
    });

    let pending: Promise<void> = Promise.resolve();
    const reject = (error: "sign_in_required" | "account_in_use") => {
      ws.send(JSON.stringify({ type: "error", error } satisfies ServerMessage));
      ws.close(1008, error);
    };

    async function onMessage(message: NonNullable<ReturnType<typeof parseClientMessage>>) {
      if (message.type === "hello") {
        if (playerId) return; // one hello per connection
        const user = accounts ? await accounts.userFromToken(message.token).catch(() => null) : null;
        if (ws.readyState !== ws.OPEN) return;
        if (room!.host.room.ranked) {
          if (!user || user.isAnonymous) return reject("sign_in_required");
          const elsewhere = [...room!.users].some(([seat, u]) => u.id === user.id && seat !== message.playerId);
          if (elsewhere) return reject("account_in_use");
        }
        const known = room!.secrets.get(message.playerId);
        if (known && !sameSecret(known, message.secret)) return ws.close(CLOSE_BAD_SECRET, "bad_secret");
        room!.secrets.set(message.playerId, message.secret);
        if (user) room!.users.set(message.playerId, user);
        playerId = message.playerId;
        const previous = room!.sockets.get(playerId);
        if (previous && previous !== ws) previous.close(CLOSE_REPLACED, "replaced");
        room!.sockets.set(playerId, ws);
        if (room!.idleTimer) clearTimeout(room!.idleTimer);
        room!.host.handle(playerId, { type: "join", name: message.name });
        return;
      }

      if (!playerId) return; // actions only after hello
      room!.host.handle(playerId, message.action);
    }

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
