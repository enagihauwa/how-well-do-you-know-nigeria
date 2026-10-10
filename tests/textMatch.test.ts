import { describe, expect, it } from "vitest";
import { matchesAnswer, normalizeAnswer } from "@/lib/modes/textMatch";

describe("normalizeAnswer", () => {
  it("drops case, accents, punctuation and extra spaces", () => {
    expect(normalizeAnswer("  Ọ̀ṣun   Òṣogbo! ")).toBe("osun osogbo");
    expect(normalizeAnswer("Puff-Puff")).toBe("puff puff");
  });
});

describe("matchesAnswer", () => {
  it("accepts the word in any case or punctuation", () => {
    expect(matchesAnswer("jollof!", ["Jollof"])).toBe(true);
    expect(matchesAnswer("PUFF PUFF", ["Puff-puff"])).toBe(true);
    expect(matchesAnswer("puffpuff", ["Puff-puff"])).toBe(true);
  });

  it("accepts aliases", () => {
    expect(matchesAnswer("iyan", ["Pounded yam", "Iyan"])).toBe(true);
  });

  it("forgives a small typo on longer words", () => {
    expect(matchesAnswer("jolof", ["Jollof"])).toBe(true);
    expect(matchesAnswer("nolywood", ["Nollywood"])).toBe(true);
    expect(matchesAnswer("afrobeets", ["Afrobeats"])).toBe(true);
  });

  it("is strict on short words", () => {
    expect(matchesAnswer("Ede", ["Eko"])).toBe(false);
    expect(matchesAnswer("Ken", ["Keke"])).toBe(false);
  });

  it("rejects empty and wrong guesses", () => {
    expect(matchesAnswer("", ["Suya"])).toBe(false);
    expect(matchesAnswer("   ", ["Suya"])).toBe(false);
    expect(matchesAnswer("Kilishi", ["Suya"])).toBe(false);
  });
});
