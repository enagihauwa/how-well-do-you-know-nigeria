import { isBotId } from "../modes/bots";
import type { ModeId, PlayerId, PlayerMatchStats, TeamId } from "../modes/types";
import { squadOrder } from "../ranking/rating";
import type { RoomState } from "./engine";

/**
 * Who won a finished match, and how each player did. Pure: the room server uses it to credit
 * progress and ratings; tests and the local test mode can use it too.
 *
 * A match is decided between "sides": teams in team modes, players (or squads) in battle royale.
 */

export interface PlayerResult {
  playerId: PlayerId;
  bot: boolean;
  /** 0 is first. Sides that tied share a rank. */
  rank: number;
  /** Sole first place. */
  won: boolean;
  /** Shared first place. */
  draw: boolean;
  score: number;
  stats: PlayerMatchStats;
}

export interface MatchResult {
  modeId: ModeId;
  players: PlayerResult[];
  /** Sides, best first, and each side's rank (equal ranks drew). For ratings. */
  order: PlayerId[][];
  ranks: number[];
  /**
   * True when at least two sides had a person on them. Only these matches count for wins,
   * ranks and leaderboards; a match against bots alone is practice.
   */
  counted: boolean;
  /** Ranked Quick Play: the match moves rank (RR). */
  ranked: boolean;
}

/** Ranks with ties: equal values share a rank, and the next rank skips (1, 1, 3). */
function ranksFor(values: number[]): number[] {
  return values.map((v) => values.filter((other) => other > v).length);
}

export function matchResult(state: RoomState): MatchResult | null {
  const summary = state.summary;
  const modeId = state.match?.modeId;
  if (state.status !== "finished" || !summary || !modeId) return null;

  // Everyone who played: the mode scored them, even if they have since left the room.
  const ids = Object.keys(summary.playerScores);
  const teamOf = (id: PlayerId): TeamId | null => state.players.find((p) => p.id === id)?.teamId ?? null;

  let order: PlayerId[][];
  let ranks: number[];
  if (summary.placements) {
    // Battle royale: finishing order is the result; squads finish as their best member.
    const squads = state.autoStart?.squadSize ?? null;
    order = squads
      ? squadOrder(summary.placements, Object.fromEntries(ids.map((id) => [id, teamOf(id) ?? id])))
      : summary.placements.map((id) => [id]);
    ranks = order.map((_, i) => i);
  } else {
    const teams = new Map<TeamId, PlayerId[]>();
    for (const id of ids) {
      const team = teamOf(id) ?? id;
      teams.set(team, [...(teams.get(team) ?? []), id]);
    }
    // Everyone on one team (Quick Play is every player for themselves): rank players by score.
    const sides = (
      teams.size > 1
        ? [...teams.entries()].map(([team, members]) => ({ members, score: summary.teamScores[team] ?? 0 }))
        : ids.map((id) => ({ members: [id], score: summary.playerScores[id] ?? 0 }))
    ).sort((a, b) => b.score - a.score);
    order = sides.map((s) => s.members);
    ranks = ranksFor(sides.map((s) => s.score));
  }

  const firsts = ranks.filter((r) => r === 0).length;
  const players: PlayerResult[] = order.flatMap((members, i) =>
    members.map((playerId) => ({
      playerId,
      bot: isBotId(playerId),
      rank: ranks[i],
      won: ranks[i] === 0 && firsts === 1,
      draw: ranks[i] === 0 && firsts > 1,
      score: summary.playerScores[playerId] ?? 0,
      stats: summary.stats?.[playerId] ?? {},
    })),
  );
  const sidesWithPeople = order.filter((members) => members.some((id) => !isBotId(id))).length;
  const counted = sidesWithPeople >= 2;
  return { modeId, players, order, ranks, counted, ranked: counted && !!state.ranked };
}
