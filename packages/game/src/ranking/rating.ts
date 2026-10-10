/**
 * Ratings for signed-in players, one per mode. A match result is a finishing order, so each
 * player is scored against every other as a head-to-head (Elo, split across the field): beat
 * someone rated above you and you gain more than for beating someone below. Squad modes rate the
 * squad by its members' average and give every member the squad's change.
 *
 * Pure: the backend loads ratings, calls `rateMatch`, and saves the result in one transaction.
 */

export const STARTING_RATING = 1000;
/** New players move faster until their rating settles. */
const K_PROVISIONAL = 64;
const K_SETTLED = 32;
export const PROVISIONAL_GAMES = 10;
const RATING_FLOOR = 100;

export interface Rating {
  rating: number;
  games: number;
}

export interface Tier {
  id: "jjc" | "learner" | "sharp" | "oga" | "chairman" | "odogwu";
  min: number;
}

/** Ladder names, lowest first. JJC: "Johnny Just Come", a newcomer. */
export const TIERS: Tier[] = [
  { id: "jjc", min: 0 },
  { id: "learner", min: 1100 },
  { id: "sharp", min: 1250 },
  { id: "oga", min: 1400 },
  { id: "chairman", min: 1550 },
  { id: "odogwu", min: 1700 },
];

export function tierFor(rating: number): Tier {
  return [...TIERS].reverse().find((t) => rating >= t.min) ?? TIERS[0];
}

const expected = (mine: number, theirs: number) => 1 / (1 + 10 ** ((theirs - mine) / 400));

/**
 * New ratings after a match. `order` is the finishing order, best first; each entry is one
 * player, or the members of one squad or team. Players missing from `ratings` start at the
 * default. `ranks` (same length as `order`) marks ties: entries with the same rank drew.
 */
export function rateMatch(
  order: string[][],
  ratings: Record<string, Rating>,
  ranks: number[] = order.map((_, i) => i),
): Record<string, Rating> {
  const get = (id: string) => ratings[id] ?? { rating: STARTING_RATING, games: 0 };
  const units = order.map((members) => ({
    members,
    rating: members.reduce((sum, id) => sum + get(id).rating, 0) / members.length,
  }));
  const n = units.length;
  const result: Record<string, Rating> = {};
  if (n < 2) return result;

  units.forEach((unit, place) => {
    let delta = 0;
    units.forEach((other, otherPlace) => {
      if (other === unit) return;
      const score = ranks[place] < ranks[otherPlace] ? 1 : ranks[place] > ranks[otherPlace] ? 0 : 0.5;
      delta += score - expected(unit.rating, other.rating);
    });
    for (const id of unit.members) {
      const current = get(id);
      const k = current.games < PROVISIONAL_GAMES ? K_PROVISIONAL : K_SETTLED;
      result[id] = {
        rating: Math.max(RATING_FLOOR, Math.round(current.rating + (k * delta) / (n - 1))),
        games: current.games + 1,
      };
    }
  });
  return result;
}

/** Battle royale placements (best first) grouped into squads, keeping each squad's best finish. */
export function squadOrder(placements: string[], squadOf: Record<string, string>): string[][] {
  const squads = new Map<string, string[]>();
  for (const id of placements) {
    const squad = squadOf[id] ?? id;
    if (!squads.has(squad)) squads.set(squad, []);
    squads.get(squad)!.push(id);
  }
  return [...squads.values()];
}
