import type { ModeContent } from "../modes";
import type { PlayerId } from "../modes/types";
import {
  botMoves,
  chatFor,
  roomDisconnect,
  roomNextDeadline,
  roomReduce,
  roomTick,
  roomViews,
  type ClientAction,
  type RoomEnv,
  type RoomState,
} from "./engine";
import type { ServerMessage } from "./protocol";

/**
 * Runs one room: applies actions, keeps the deadline timer, and sends each player what changed.
 * Transport-agnostic: the WebSocket server and the local development transport both wrap it.
 *
 * Bandwidth and rendering: a view is sent only when it differs from the last one that player got
 * (compared as JSON), and chat goes out as new messages only, never the whole history again.
 */

export interface RoomHostDeps {
  content: ModeContent;
  send: (to: PlayerId, message: ServerMessage) => void;
  now?: () => number;
  rng?: () => number;
  /** Called after every change, e.g. to save the room so it survives a restart or reload. */
  persist?: (state: RoomState) => void;
}

export class RoomHost {
  private state: RoomState;
  private readonly deps: Required<Omit<RoomHostDeps, "persist">> & Pick<RoomHostDeps, "persist">;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastView = new Map<PlayerId, string>();
  private lastChat = new Map<PlayerId, number>();
  private disposed = false;
  /** Bot moves already scheduled, keyed by bot and turn, so each bot acts once per turn. */
  private botPlans = new Set<string>();
  private botTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(state: RoomState, deps: RoomHostDeps) {
    this.state = state;
    this.deps = { now: Date.now, rng: Math.random, ...deps };
    this.schedule();
  }

  get room(): RoomState {
    return this.state;
  }

  private env(): RoomEnv {
    return { now: this.deps.now(), rng: this.deps.rng, content: this.deps.content };
  }

  /** A player's action. Refusals go back to that player only. */
  handle(from: PlayerId, action: ClientAction) {
    if (this.disposed) return;
    const result = roomReduce(this.state, from, action, this.env());
    if (result.error) this.deps.send(from, { type: "error", error: result.error });
    if (action.type === "join" && !result.error) {
      // A (re)joining phone has nothing yet: send it everything.
      this.lastView.delete(from);
      this.lastChat.delete(from);
    }
    if (result.state !== this.state || action.type === "join") this.commit(result.state);
  }

  disconnect(playerId: PlayerId) {
    if (this.disposed) return;
    this.lastView.delete(playerId);
    this.lastChat.delete(playerId);
    this.commit(roomDisconnect(this.state, playerId, this.env()));
  }

  /** True when no person is connected (bots don't count), so the owner can clean the room up. */
  isIdle(): boolean {
    return !this.state.players.some((p) => p.connected && !p.bot);
  }

  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.botTimers.forEach(clearTimeout);
  }

  private commit(next: RoomState) {
    if (this.disposed) return;
    const before = this.state;
    this.state = next;
    this.deps.persist?.(next);
    // Turn ids (question numbers) repeat in the next match, so forget the last match's plans.
    if (before.status !== "playing" && next.status === "playing") this.botPlans.clear();

    for (const p of before.players) {
      if (next.kicked.includes(p.id) && !next.players.some((q) => q.id === p.id)) {
        this.deps.send(p.id, { type: "error", error: "kicked" });
      }
    }

    const env = this.env();
    for (const [playerId, view] of roomViews(next, env)) {
      const json = JSON.stringify(view);
      if (this.lastView.get(playerId) !== json) {
        this.lastView.set(playerId, json);
        this.deps.send(playerId, { type: "view", view, serverNow: env.now });
      }
      const seen = this.lastChat.get(playerId);
      const fresh = chatFor(next, playerId, seen ?? 0);
      if (seen === undefined || fresh.length > 0) {
        this.lastChat.set(playerId, next.chatSeq);
        this.deps.send(playerId, { type: "chat", messages: fresh, reset: seen === undefined });
      }
    }
    this.schedule();
    this.scheduleBots(env);
  }

  private scheduleBots(env: RoomEnv) {
    for (const move of botMoves(this.state, env)) {
      const key = `${move.botId}@${move.turn}`;
      if (this.botPlans.has(key)) continue;
      this.botPlans.add(key);
      const timer = setTimeout(() => {
        this.botTimers.delete(timer);
        this.handle(move.botId, move.action);
      }, move.afterMs);
      this.botTimers.add(timer);
    }
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const at = roomNextDeadline(this.state);
    if (at === null || this.disposed) return;
    this.timer = setTimeout(() => this.commit(roomTick(this.state, this.env())), Math.max(0, at - this.deps.now()));
  }
}
