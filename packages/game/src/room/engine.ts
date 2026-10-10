import { defaultModeConfigs, modes, type ModeAction, type ModeConfigs, type ModeContent, type ModeView } from "../modes";
import type { AnswerRule } from "../modes/trivia";
import type { MatchSummary, ModeContext, ModeId, PlayerId, StartProblem, TeamId } from "../modes/types";
import type { CategoryId } from "../types";

/**
 * The room: lobby, teams, host, presence, and running a mode. Pure and shared with the backend
 * room server, which wraps it the same way the local transport does: apply an action, then send
 * every player their own `roomView`. Uses `env.now` and `env.rng`, never Date.now() or Math.random().
 */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const MAX_TEAMS = 4;
export const MAX_NAME_LENGTH = 20;
/** How long a dropped player's seat is held before they are removed. */
export const SEAT_HOLD_MS = 60_000;
/**
 * A dropped host keeps the role this long before it passes on, so a phone that blips off the
 * network (common on mobile data) is still host when it reconnects. Rounds auto-advance meanwhile.
 */
export const HOST_GRACE_MS = 10_000;
const TEAM_SLOTS: TeamId[] = ["t0", "t1", "t2", "t3"];
export const CHAT_MAX_LENGTH = 200;
/** Messages kept in the room; older ones drop off. */
export const CHAT_HISTORY = 100;
/** At most this many messages per player in `CHAT_WINDOW_MS`. */
export const CHAT_BURST = 5;
export const CHAT_WINDOW_MS = 5000;

/**
 * Public rooms are for strangers, so chat there is preset phrases only (shown translated on each
 * phone). Free text and voice stay in private rooms with friends.
 */
export const QUICK_CHAT = ["oya", "nice", "wp", "gg", "chai", "ehen", "lol", "fast"] as const;
export type QuickChat = (typeof QUICK_CHAT)[number];

/** Quick Play rooms: filled by the matchmaker, no host, start themselves. */
export interface PublicRoomOptions {
  mode: ModeId;
  /** Ranked Quick Play: the result moves rank (RR). Never filled with bots. */
  ranked?: boolean;
  minPlayers: number;
  maxPlayers: number;
  /** Once `minPlayers` are in, the match starts after this long (or at once when full). */
  countdownMs: number;
  /** Squad size for team modes; null for every-player-for-themselves. */
  squadSize: number | null;
  /**
   * If the room is still short of `minPlayers` this long after the first person joined, bots fill
   * the empty places so nobody waits forever (e.g. a lone player at 2am). Null: never add bots.
   */
  botFillMs: number | null;
}

/** After bots fill a room, the match starts this soon. */
export const BOT_START_MS = 3000;
/** Names bots use. They are always labelled as bots on screen. */
const BOT_NAMES = ["Chiamaka", "Tunde", "Aisha", "Emeka", "Ngozi", "Musa", "Bisi", "Ifeanyi", "Zainab", "Segun", "Halima", "Obinna", "Funke", "Garba", "Uche", "Kemi"];
export { isBotId } from "../modes/bots";

export interface ChatMessage {
  /** Increases by one per message in the room, so a phone can ask for "everything after N". */
  id: number;
  from: PlayerId;
  name: string;
  /** Null: the whole room. A team id: only that team sees it. */
  teamId: TeamId | null;
  text: string;
  at: number;
}

export interface RoomPlayer {
  id: PlayerId;
  name: string;
  /** A computer player filling an empty place in a public room. */
  bot?: boolean;
  teamId: TeamId | null;
  connected: boolean;
  disconnectedAt: number | null;
}

export interface RoomSettings {
  mode: ModeId;
  configs: ModeConfigs;
  /** Everyone is physically together: voice chat stays off. */
  sameRoom: boolean;
}

export type RoomStatus = "lobby" | "playing" | "finished";

export interface RoomState {
  code: string;
  kind: "private" | "public";
  /** Ranked Quick Play (public rooms only). Absent in rooms saved before ranked play existed. */
  ranked?: boolean;
  maxPlayers: number;
  /** Public rooms only. `startsAt` is set once enough players are in. */
  autoStart: {
    minPlayers: number;
    countdownMs: number;
    squadSize: number | null;
    startsAt: number | null;
    botFillMs: number | null;
    /** When the first person joined: the bot timer counts from here. */
    openedAt: number | null;
  } | null;
  hostId: PlayerId | null;
  /** In join order; the first connected player inherits host. */
  players: RoomPlayer[];
  teamIds: TeamId[];
  settings: RoomSettings;
  status: RoomStatus;
  match: { modeId: ModeId; state: unknown } | null;
  summary: MatchSummary | null;
  kicked: PlayerId[];
  chat: ChatMessage[];
  chatSeq: number;
  /** Recent send times per player, for the rate limit. */
  chatTimes: Record<PlayerId, number[]>;
}

export type ClientAction =
  | { type: "join"; name: string }
  | { type: "leave" }
  | { type: "set_team"; teamId: TeamId | null }
  | { type: "add_team" }
  | { type: "remove_team"; teamId: TeamId }
  | { type: "set_mode"; mode: ModeId }
  | { type: "set_trivia"; category?: CategoryId; answerRule?: AnswerRule }
  | { type: "set_same_room"; value: boolean }
  | { type: "kick"; playerId: PlayerId }
  /** Private lobbies: the host seats a bot (removed again with `kick`). */
  | { type: "add_bot" }
  | { type: "start" }
  | { type: "back_to_lobby" }
  | { type: "chat"; text: string; toTeam: boolean }
  | { type: "mode"; action: ModeAction };

export type RoomError =
  | "invalid_name"
  | "room_full"
  | "already_started"
  | "kicked"
  | "not_in_room"
  | "not_host"
  | "need_players"
  | "need_team"
  | "chat_too_fast"
  | "chat_blocked"
  | "bots_unsupported"
  | StartProblem;

export interface RoomEnv {
  now: number;
  rng: () => number;
  content: ModeContent;
}

export interface RoomResult {
  state: RoomState;
  error?: RoomError;
}

export interface RoomView {
  code: string;
  kind: "private" | "public";
  ranked: boolean;
  /** Public rooms: when the match starts by itself, on the room's clock. */
  startsAt: number | null;
  /** Public rooms: when bots will fill the empty places, if the room is still short. */
  botsAt: number | null;
  you: PlayerId;
  hostId: PlayerId | null;
  status: RoomStatus;
  players: { id: PlayerId; name: string; teamId: TeamId | null; connected: boolean; bot: boolean }[];
  teamIds: TeamId[];
  settings: RoomSettings;
  maxPlayers: number;
  /** Players needed before a match can start (public rooms: before the countdown). */
  minPlayers: number;
  /** Why the host cannot start yet, or null. Only meaningful in the lobby. */
  startProblem: RoomError | null;
  match: ModeView | null;
  summary: MatchSummary | null;
}

/** A private room. `mode` is the game it opens with; the host can still change it in the lobby. */
export function createRoom(code: string, mode: ModeId = "trivia"): RoomState {
  return {
    code,
    kind: "private",
    maxPlayers: MAX_PLAYERS,
    autoStart: null,
    hostId: null,
    players: [],
    teamIds: ["t0", "t1"],
    settings: { mode, configs: defaultModeConfigs(), sameRoom: false },
    status: "lobby",
    match: null,
    summary: null,
    kicked: [],
    chat: [],
    chatSeq: 0,
    chatTimes: {},
  };
}

export function createPublicRoom(code: string, options: PublicRoomOptions): RoomState {
  const base = createRoom(code);
  const configs = { ...base.settings.configs };
  if (options.mode === "battle-royale") configs["battle-royale"] = { ...configs["battle-royale"], squads: options.squadSize !== null };
  // Quick Play trivia is every player for themselves: one pick each, scored per player.
  if (options.mode === "trivia") configs.trivia = { ...configs.trivia, answerRule: "individual" };
  return {
    ...base,
    kind: "public",
    ranked: !!options.ranked,
    maxPlayers: options.maxPlayers,
    teamIds: ["t0"],
    settings: { ...base.settings, mode: options.mode, configs },
    autoStart: {
      minPlayers: options.minPlayers,
      countdownMs: options.countdownMs,
      squadSize: options.squadSize,
      startsAt: null,
      botFillMs: options.botFillMs,
      openedAt: null,
    },
  };
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

function modeContext(state: RoomState, env: RoomEnv): ModeContext {
  return {
    players: state.players
      .filter((p) => p.connected && p.teamId !== null)
      .map((p) => ({ id: p.id, name: p.name, teamId: p.teamId! })),
    teamIds: state.teamIds,
    hostId: state.hostId ?? "",
    now: env.now,
    rng: env.rng,
  };
}

/**
 * Host stays while connected or within `HOST_GRACE_MS` of dropping; otherwise the earliest
 * connected player, then anyone left.
 */
function withHost(state: RoomState, now: number): RoomState {
  if (state.kind === "public") return state.hostId === null ? state : { ...state, hostId: null };
  const current = state.players.find((p) => p.id === state.hostId);
  if (current?.connected) return state;
  if (current?.disconnectedAt != null && now < current.disconnectedAt + HOST_GRACE_MS) return state;
  // Bots never host: they can't press Start or Next.
  const people = state.players.filter((p) => !p.bot);
  const next = people.find((p) => p.connected) ?? people[0] ?? null;
  return { ...state, hostId: next?.id ?? null };
}

function removePlayer(state: RoomState, playerId: PlayerId, now: number): RoomState {
  return withHost({ ...state, players: state.players.filter((p) => p.id !== playerId) }, now);
}

function updatePlayer(state: RoomState, playerId: PlayerId, patch: Partial<RoomPlayer>): RoomState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)),
  };
}

/** Ends the match if the mode says it is over. */
function settle(state: RoomState): RoomState {
  if (state.status !== "playing" || !state.match) return state;
  const { mode } = modes[state.match.modeId];
  if (!mode.isFinished(state.match.state)) return state;
  return { ...state, status: "finished", summary: mode.summary(state.match.state) };
}

/** Public lobbies: start the countdown once enough players are in, stop it if they drop below. */
function withCountdown(state: RoomState, now: number): RoomState {
  const auto = state.autoStart;
  if (!auto || state.status !== "lobby") return state;
  const present = state.players.filter((p) => p.connected).length;
  let startsAt = auto.startsAt;
  if (present < auto.minPlayers) startsAt = null;
  else if (present >= state.maxPlayers) startsAt = now;
  else if (startsAt === null) startsAt = now + auto.countdownMs;
  return startsAt === auto.startsAt ? state : { ...state, autoStart: { ...auto, startsAt } };
}

const humansPresent = (state: RoomState) => state.players.filter((p) => p.connected && !p.bot).length;

/** When bots will be added, or null if they won't be (enough players, no humans, or bots off). */
function botsDueAt(state: RoomState): number | null {
  const auto = state.autoStart;
  if (!auto || auto.botFillMs === null || auto.openedAt === null || state.status !== "lobby") return null;
  const present = state.players.filter((p) => p.connected).length;
  if (present >= auto.minPlayers || humansPresent(state) === 0) return null;
  return auto.openedAt + auto.botFillMs;
}

/** True when the room's game has bot play (a mode opts in with `botAction`). */
export const modeHasBots = (mode: ModeId) => !!modes[mode].mode.botAction;

/** Seats one bot with a free id and an unused name. */
function withBot(state: RoomState, teamId: TeamId): RoomState {
  const ids = new Set(state.players.map((p) => p.id));
  let n = 0;
  while (ids.has(`bot-${n}`)) n++;
  const taken = new Set(state.players.map((p) => p.name));
  const name = BOT_NAMES.find((b) => !taken.has(b)) ?? `Bot ${n + 1}`;
  const bot: RoomPlayer = { id: `bot-${n}`, name, bot: true, teamId, connected: true, disconnectedAt: null };
  return { ...state, players: [...state.players, bot] };
}

/** The team a new bot joins in a private room: the one with the fewest players. */
function emptiestTeam(state: RoomState): TeamId {
  const size = (id: TeamId) => state.players.filter((p) => p.connected && p.teamId === id).length;
  return state.teamIds.reduce((best, id) => (size(id) < size(best) ? id : best));
}

/** Fills a public lobby up to its minimum with bots and starts the match shortly after. */
function fillWithBots(state: RoomState, now: number): RoomState {
  const auto = state.autoStart!;
  const present = state.players.filter((p) => p.connected).length;
  let next = state;
  for (let i = present; i < auto.minPlayers; i++) next = withBot(next, "t0");
  return { ...next, autoStart: { ...auto, startsAt: now + BOT_START_MS } };
}

/** Public squads: deal the players into squads of the room's size, at random. */
function dealSquads(state: RoomState, env: RoomEnv): RoomState {
  const size = state.autoStart?.squadSize;
  if (!size) return state;
  const present = state.players.filter((p) => p.connected).map((p) => p.id);
  for (let i = present.length - 1; i > 0; i--) {
    const j = Math.floor(env.rng() * (i + 1));
    [present[i], present[j]] = [present[j], present[i]];
  }
  const squadOf = new Map(present.map((id, i) => [id, `s${Math.floor(i / size)}`]));
  const teamIds = [...new Set(squadOf.values())];
  return { ...state, teamIds, players: state.players.map((p) => ({ ...p, teamId: squadOf.get(p.id) ?? null })) };
}

function startMatch(state: RoomState, env: RoomEnv): RoomResult {
  const problem = checkStart(state, env);
  if (problem) return { state, error: problem };
  const dealt = dealSquads(state, env);
  const { mode, content } = modes[dealt.settings.mode];
  const matchState = mode.start(dealt.settings.configs[dealt.settings.mode], content(env.content), modeContext(dealt, env));
  return {
    state: {
      ...dealt,
      status: "playing",
      summary: null,
      match: { modeId: dealt.settings.mode, state: matchState },
      autoStart: dealt.autoStart && { ...dealt.autoStart, startsAt: null },
    },
  };
}

export function checkStart(state: RoomState, env: RoomEnv): RoomError | null {
  const present = state.players.filter((p) => p.connected);
  if (present.length < (state.autoStart?.minPlayers ?? MIN_PLAYERS)) return "need_players";
  if (present.some((p) => p.teamId === null)) return "need_team";
  if (present.some((p) => p.bot) && !modeHasBots(state.settings.mode)) return "bots_unsupported";
  const { mode, content } = modes[state.settings.mode];
  return mode.canStart(state.settings.configs[state.settings.mode], content(env.content), modeContext(state, env));
}

export function roomReduce(state: RoomState, from: PlayerId, action: ClientAction, env: RoomEnv): RoomResult {
  const fail = (error: RoomError): RoomResult => ({ state, error });
  const ok = (next: RoomState): RoomResult => ({ state: next });

  if (action.type === "join") {
    const name = cleanName(action.name);
    if (!name) return fail("invalid_name");
    if (state.kicked.includes(from)) return fail("kicked");
    if (state.players.some((p) => p.id === from)) {
      // Rejoining the held seat, e.g. after a reload or a network drop.
      return ok(withCountdown(withHost(updatePlayer(state, from, { name, connected: true, disconnectedAt: null }), env.now), env.now));
    }
    if (state.status === "playing") return fail("already_started");
    if (state.status === "finished" && state.kind === "public") return fail("already_started");
    if (state.players.length >= state.maxPlayers) return fail("room_full");
    // Public rooms have no team picking: everyone waits in one group; squads are dealt at the start.
    // Private rooms seat newcomers on the smallest team; they can still switch in the lobby.
    const teamId = state.kind === "public" ? "t0" : emptiestTeam(state);
    const player: RoomPlayer = { id: from, name, teamId, connected: true, disconnectedAt: null };
    let next: RoomState = { ...state, players: [...state.players, player] };
    if (next.autoStart && next.autoStart.openedAt === null) next = { ...next, autoStart: { ...next.autoStart, openedAt: env.now } };
    return ok(withCountdown(withHost(next, env.now), env.now));
  }

  const me = state.players.find((p) => p.id === from);
  if (!me) return fail("not_in_room");
  const isHost = state.hostId === from;
  const inLobby = state.status === "lobby";

  switch (action.type) {
    case "leave":
      return ok(withCountdown(removePlayer(state, from, env.now), env.now));

    case "set_team":
      if (state.kind === "public") return fail("not_host");
      if (!inLobby) return ok(state);
      if (action.teamId !== null && !state.teamIds.includes(action.teamId)) return ok(state);
      return ok(updatePlayer(state, from, { teamId: action.teamId }));

    case "add_team": {
      if (!isHost) return fail("not_host");
      if (!inLobby || state.teamIds.length >= MAX_TEAMS) return ok(state);
      const slot = TEAM_SLOTS.find((id) => !state.teamIds.includes(id))!;
      return ok({ ...state, teamIds: TEAM_SLOTS.filter((id) => id === slot || state.teamIds.includes(id)) });
    }

    case "remove_team":
      if (!isHost) return fail("not_host");
      if (!inLobby || state.teamIds.length <= 1 || !state.teamIds.includes(action.teamId)) return ok(state);
      return ok({
        ...state,
        teamIds: state.teamIds.filter((id) => id !== action.teamId),
        players: state.players.map((p) => (p.teamId === action.teamId ? { ...p, teamId: null } : p)),
      });

    case "set_mode":
      if (!isHost) return fail("not_host");
      if (!inLobby || !(action.mode in modes)) return ok(state);
      return ok({ ...state, settings: { ...state.settings, mode: action.mode } });

    case "set_trivia": {
      if (!isHost) return fail("not_host");
      if (!inLobby) return ok(state);
      const trivia = { ...state.settings.configs.trivia };
      if (action.category) trivia.category = action.category;
      if (action.answerRule) trivia.answerRule = action.answerRule;
      return ok({
        ...state,
        settings: { ...state.settings, configs: { ...state.settings.configs, trivia } },
      });
    }

    case "set_same_room":
      if (!isHost) return fail("not_host");
      return ok({ ...state, settings: { ...state.settings, sameRoom: action.value } });

    case "kick":
      if (!isHost) return fail("not_host");
      if (action.playerId === from) return ok(state);
      return ok({ ...removePlayer(state, action.playerId, env.now), kicked: [...state.kicked, action.playerId] });

    case "add_bot":
      if (!isHost || state.kind === "public") return fail("not_host");
      if (!inLobby) return ok(state);
      if (!modeHasBots(state.settings.mode)) return fail("bots_unsupported");
      if (state.players.length >= state.maxPlayers) return fail("room_full");
      return ok(withBot(state, emptiestTeam(state)));

    case "start":
      if (!isHost) return fail("not_host");
      if (!inLobby) return ok(state);
      return startMatch(state, env);

    case "chat": {
      const text = action.text.replace(/\s+/g, " ").trim().slice(0, CHAT_MAX_LENGTH);
      if (!text) return ok(state);
      if (state.kind === "public" && !(QUICK_CHAT as readonly string[]).includes(text)) return ok(state);
      const teamId = action.toTeam ? me.teamId : null;
      if (action.toTeam && !teamId) return ok(state);
      // A mode can mute a player, e.g. the No Talk Am describer, who could otherwise type the word.
      if (state.status === "playing" && state.match) {
        const { mode } = modes[state.match.modeId];
        if (mode.canChat && !mode.canChat(state.match.state, from, modeContext(state, env))) return fail("chat_blocked");
      }
      const recent = (state.chatTimes[from] ?? []).filter((t) => env.now - t < CHAT_WINDOW_MS);
      if (recent.length >= CHAT_BURST) return fail("chat_too_fast");
      const message: ChatMessage = { id: state.chatSeq + 1, from, name: me.name, teamId, text, at: env.now };
      return ok({
        ...state,
        chat: [...state.chat.slice(-(CHAT_HISTORY - 1)), message],
        chatSeq: message.id,
        chatTimes: { ...state.chatTimes, [from]: [...recent, env.now] },
      });
    }

    case "back_to_lobby":
      if (!isHost) return fail("not_host");
      if (state.status !== "finished") return ok(state);
      return ok({ ...state, status: "lobby", match: null });

    case "mode": {
      if (state.status !== "playing" || !state.match) return ok(state);
      const { mode } = modes[state.match.modeId];
      const next = mode.reduce(state.match.state, from, action.action, modeContext(state, env));
      if (next === state.match.state) return ok(state);
      return ok(settle({ ...state, match: { ...state.match, state: next } }));
    }

    default:
      return ok(state);
  }
}

/** The player's connection dropped. Their seat is held for `SEAT_HOLD_MS`. */
export function roomDisconnect(state: RoomState, playerId: PlayerId, env: RoomEnv): RoomState {
  // Bots have no connection to lose: a transport that "times them out" must not remove them.
  if (!state.players.some((p) => p.id === playerId && p.connected && !p.bot)) return state;
  return roomTick(withCountdown(updatePlayer(state, playerId, { connected: false, disconnectedAt: env.now }), env.now), env);
}

/** Expires held seats and runs the mode's timers. Call it at `roomNextDeadline` and after presence changes. */
export function roomTick(state: RoomState, env: RoomEnv): RoomState {
  let next = state;
  for (const p of state.players) {
    if (!p.connected && p.disconnectedAt !== null && env.now >= p.disconnectedAt + SEAT_HOLD_MS) {
      next = removePlayer(next, p.id, env.now);
    }
  }
  next = withCountdown(withHost(next, env.now), env.now);
  const botsAt = botsDueAt(next);
  if (botsAt !== null && env.now >= botsAt) next = fillWithBots(next, env.now);
  const startsAt = next.autoStart?.startsAt;
  if (next.status === "lobby" && startsAt != null && env.now >= startsAt) {
    const started = startMatch(next, env);
    if (!started.error) next = started.state;
  }
  if (next.status === "playing" && next.match) {
    const { mode } = modes[next.match.modeId];
    const ticked = mode.tick(next.match.state, modeContext(next, env));
    if (ticked !== next.match.state) next = settle({ ...next, match: { ...next.match, state: ticked } });
  }
  return next;
}

export function roomNextDeadline(state: RoomState): number | null {
  const deadlines: number[] = [];
  for (const p of state.players) {
    if (!p.connected && p.disconnectedAt !== null) {
      deadlines.push(p.disconnectedAt + SEAT_HOLD_MS);
      if (p.id === state.hostId) deadlines.push(p.disconnectedAt + HOST_GRACE_MS);
    }
  }
  if (state.status === "lobby" && state.autoStart?.startsAt != null) deadlines.push(state.autoStart.startsAt);
  const botsAt = botsDueAt(state);
  if (botsAt !== null) deadlines.push(botsAt);
  if (state.status === "playing" && state.match) {
    const d = modes[state.match.modeId].mode.nextDeadline(state.match.state);
    if (d !== null) deadlines.push(d);
  }
  return deadlines.length ? Math.min(...deadlines) : null;
}

/** The parts of a view that are the same for everyone, computed once per broadcast. */
interface SharedView {
  ctx: ModeContext;
  base: Omit<RoomView, "you" | "match">;
}

function sharedView(state: RoomState, env: RoomEnv): SharedView {
  return {
    ctx: modeContext(state, env),
    base: {
      code: state.code,
      kind: state.kind,
      ranked: !!state.ranked,
      startsAt: state.autoStart?.startsAt ?? null,
      botsAt: botsDueAt(state),
      hostId: state.hostId,
      status: state.status,
      players: state.players.map(({ id, name, teamId, connected, bot }) => ({ id, name, teamId, connected, bot: !!bot })),
      teamIds: state.teamIds,
      settings: state.settings,
      maxPlayers: state.maxPlayers,
      minPlayers: state.autoStart?.minPlayers ?? MIN_PLAYERS,
      startProblem: state.status === "lobby" ? checkStart(state, env) : null,
      summary: state.summary,
    },
  };
}

function viewFor(state: RoomState, shared: SharedView, playerId: PlayerId): RoomView {
  const match =
    state.match && state.status !== "lobby"
      ? modes[state.match.modeId].mode.view(state.match.state, playerId, shared.ctx)
      : null;
  return { ...shared.base, you: playerId, match };
}

export function roomView(state: RoomState, playerId: PlayerId, env: RoomEnv): RoomView {
  return viewFor(state, sharedView(state, env), playerId);
}

/** Every connected player's view. */
export function roomViews(state: RoomState, env: RoomEnv): Map<PlayerId, RoomView> {
  const shared = sharedView(state, env);
  return new Map(state.players.filter((p) => p.connected && !p.bot).map((p) => [p.id, viewFor(state, shared, p.id)]));
}

/** Chat this player may see with an id above `afterId`: the whole room's, and their own team's. */
export function chatFor(state: RoomState, playerId: PlayerId, afterId = 0): ChatMessage[] {
  const teamId = state.players.find((p) => p.id === playerId)?.teamId ?? null;
  return state.chat.filter((m) => m.id > afterId && (m.teamId === null || m.teamId === teamId));
}

/**
 * What each bot does next and when: the room host schedules these. A bot acts once per turn (the
 * mode's `botTurn`, e.g. once per question), so `turn` keys the schedule.
 */
export function botMoves(state: RoomState, env: RoomEnv): { botId: PlayerId; turn: string; action: ClientAction; afterMs: number }[] {
  if (state.status !== "playing" || !state.match) return [];
  const { mode } = modes[state.match.modeId];
  const turn = mode.botTurn?.(state.match.state);
  if (!turn || !mode.botAction) return [];
  const ctx = modeContext(state, env);
  const moves: { botId: PlayerId; turn: string; action: ClientAction; afterMs: number }[] = [];
  for (const p of state.players) {
    if (!p.bot || !p.connected) continue;
    const plan = mode.botAction(state.match.state, p.id, ctx);
    if (plan) moves.push({ botId: p.id, turn, action: { type: "mode", action: plan.action }, afterMs: plan.afterMs });
  }
  return moves;
}
