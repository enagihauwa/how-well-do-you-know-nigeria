import type { ModeContext, ModePlayer } from "@/lib/modes/types";

/** Deterministic random numbers, so tests that shuffle are repeatable. */
export function seededRng(seed = 1): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ctxWith(players: ModePlayer[], overrides: Partial<ModeContext> = {}): ModeContext {
  return {
    players,
    teamIds: [...new Set(players.map((p) => p.teamId))],
    hostId: players[0]?.id ?? "",
    now: 1_000_000,
    rng: seededRng(),
    ...overrides,
  };
}
