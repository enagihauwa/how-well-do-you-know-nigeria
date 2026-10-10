/**
 * Lenient matching for typed answers: "Jollof", "jollof!" and "jolof" all count for "Jollof".
 * Shared with the backend, so no React, Next or browser APIs here.
 */

/** Lowercase, strip accents (Ọ̀ṣun → osun), drop punctuation, collapse spaces. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Two reusable rows, so checking a guess allocates nothing. Answers are short (a word or two).
let rowA = new Uint16Array(64);
let rowB = new Uint16Array(64);

function editDistance(a: string, b: string): number {
  if (b.length + 1 > rowA.length) {
    rowA = new Uint16Array(b.length + 1);
    rowB = new Uint16Array(b.length + 1);
  }
  let prev = rowA;
  let curr = rowB;
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const sub = prev[j - 1] + (ai === b.charCodeAt(j - 1) ? 0 : 1);
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, sub);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// The same few accepted answers are checked against every guess in a round; normalise each once.
const normalizedCache = new Map<string, { spaced: string; joined: string }>();
const CACHE_LIMIT = 5000;

function normalizedAccepted(answer: string) {
  let hit = normalizedCache.get(answer);
  if (!hit) {
    if (normalizedCache.size >= CACHE_LIMIT) normalizedCache.clear();
    const spaced = normalizeAnswer(answer);
    hit = { spaced, joined: spaced.replace(/ /g, "") };
    normalizedCache.set(answer, hit);
  }
  return hit;
}

/** Typos allowed: none for short words, so "Eko" does not match "Ede". */
function allowedTypos(length: number): number {
  if (length >= 9) return 2;
  if (length >= 5) return 1;
  return 0;
}

/** True if `guess` matches any accepted spelling, ignoring case, accents, spacing and small typos. */
export function matchesAnswer(guess: string, accepted: readonly string[]): boolean {
  const g = normalizeAnswer(guess);
  if (!g) return false;
  const gJoined = g.replace(/ /g, "");
  return accepted.some((answer) => {
    const a = normalizedAccepted(answer);
    if (g === a.spaced || gJoined === a.joined) return true;
    const typos = allowedTypos(a.spaced.length);
    // Lengths further apart than the allowed typos can never match: skip the comparison.
    if (typos === 0 || Math.abs(g.length - a.spaced.length) > typos) return false;
    return editDistance(g, a.spaced) <= typos;
  });
}
