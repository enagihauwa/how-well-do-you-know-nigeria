import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEME_STORAGE_KEY, isTheme, themeInitScript } from "@/lib/theme";

/** Runs the real head script against stubbed browser objects and returns what it did. */
function runInitScript(storage: { getItem: (key: string) => string | null }) {
  const attributes: Record<string, string> = {};
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      },
    },
  };
  new Function("localStorage", "document", themeInitScript)(storage, document);
  return attributes;
}

describe("isTheme", () => {
  it("accepts only 'light' and 'dark'", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe("theme defaults", () => {
  it("first-time visitors get light", () => {
    expect(DEFAULT_THEME).toBe("light");
  });
});

describe("themeInitScript (applied before first paint)", () => {
  it("reads the saved theme from the documented storage key", () => {
    let requestedKey = "";
    runInitScript({
      getItem: (key) => {
        requestedKey = key;
        return null;
      },
    });
    expect(requestedKey).toBe(THEME_STORAGE_KEY);
  });

  it("restores a saved dark theme", () => {
    expect(runInitScript({ getItem: () => "dark" })).toEqual({ "data-theme": "dark" });
  });

  it("restores a saved light theme", () => {
    expect(runInitScript({ getItem: () => "light" })).toEqual({ "data-theme": "light" });
  });

  it("uses light when nothing is saved", () => {
    expect(runInitScript({ getItem: () => null })).toEqual({ "data-theme": "light" });
  });

  it("ignores an invalid saved value and uses light", () => {
    expect(runInitScript({ getItem: () => "purple" })).toEqual({ "data-theme": "light" });
  });

  it("does not throw when storage is unavailable, and leaves the default in place", () => {
    const attributes = runInitScript({
      getItem: () => {
        throw new Error("storage blocked");
      },
    });
    expect(attributes).toEqual({});
  });
});
