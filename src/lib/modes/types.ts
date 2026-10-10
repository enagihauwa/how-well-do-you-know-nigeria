/**
 * The contract every mini game implements. A room (lobby, teams, host, voice) runs any mode
 * through this interface. Shared with the backend room server: keep it pure, with no React,
 * Next or browser APIs, and no Date.now() or Math.random() (use `ctx.now` and `ctx.rng`).
 */

export type PlayerId = string;
export type TeamId = string;
export type ModeId = "trivia" | "no-talk-am" | "guess-the-year" | "sort-am" | "battle-royale";

export interface ModePlayer {
  id: PlayerId;
  name: string;
  teamId: TeamId;
}

export interface ModeContext {
  /** Players on a team who are in the room right now. */
  players: readonly ModePlayer[];
  teamIds: readonly TeamId[];
  hostId: PlayerId;
  now: number;
  rng: () => number;
}

export interface MatchSummary {
  teamScores: Record<TeamId, number>;
  playerScores: Record<PlayerId, number>;
  /** Best first, for modes where finishing position is the result (battle royale). */
  placements?: PlayerId[];
}

/** Why a match cannot start, for the lobby to show. */
export type StartProblem = "need_two_per_team" | "not_enough_content";

export interface GameMode<Config, Content, State, Action, View> {
  id: ModeId;
  defaultConfig: Config;
  /** Null if the match can start with these players, or the reason it cannot. */
  canStart(config: Config, content: Content, ctx: ModeContext): StartProblem | null;
  start(config: Config, content: Content, ctx: ModeContext): State;
  /** A player's action. Invalid or late actions return the state unchanged. */
  reduce(state: State, playerId: PlayerId, action: Action, ctx: ModeContext): State;
  /** Moves past any deadline that has passed. Called by the room's timer. */
  tick(state: State, ctx: ModeContext): State;
  /** When `tick` next needs to run, or null if nothing is timed. */
  nextDeadline(state: State): number | null;
  /** What one player may see. Secrets (answers, the word to describe) never leak to others. */
  view(state: State, playerId: PlayerId, ctx: ModeContext): View;
  /** Optional, for bots: an id for the current turn (e.g. the question number), or null when bots have nothing to do. */
  botTurn?(state: State): string | null;
  /** Optional, for bots: what this bot does this turn and how long it "thinks" first. */
  botAction?(state: State, botId: PlayerId, ctx: ModeContext): { action: Action; afterMs: number } | null;
  /** Optional: false mutes a player's chat, e.g. a describer who could type the word. */
  canChat?(state: State, playerId: PlayerId, ctx: ModeContext): boolean;
  isFinished(state: State): boolean;
  summary(state: State): MatchSummary;
}
