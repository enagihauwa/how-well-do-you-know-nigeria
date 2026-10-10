import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCE,
  THEME_STORAGE_KEY,
  isThemePreference,
  resolveTheme,
  themeInitScript,
} from "@/lib/theme";

/** Runs the real head script against stubbed browser objects and returns what it did. */
function runInitScript(storage: { getItem: (key: string) => string | null }, systemDark = false) {
  const attributes: Record<string, string> = {};
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      },
    },
  };
  const window = { matchMedia: () => ({ matches: systemDark }) };
  new Function("localStorage", "document", "window", themeInitScript)(storage, document, window);
  return attributes;
}

describe("isThemePreference", () => {
  it("accepts light, dark and system only", () => {
    for (const ok of ["light", "dark", "system"]) expect(isThemePreference(ok)).toBe(true);
    for (const bad of ["", "purple", null, undefined]) expect(isThemePreference(bad)).toBe(false);
  });
});

describe("resolveTheme", () => {
  it("follows the phone by default", () => {
    expect(DEFAULT_PREFERENCE).toBe("system");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("an explicit choice wins over the phone", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("themeInitScript (applied before first paint)", () => {
  it("reads the saved preference from the documented storage key", () => {
    let requestedKey = "";
    runInitScript({
      getItem: (key) => {
        requestedKey = key;
        return null;
      },
    });
    expect(requestedKey).toBe(THEME_STORAGE_KEY);
  });

  it("restores a saved light or dark choice regardless of the phone", () => {
    expect(runInitScript({ getItem: () => "dark" }, false)).toEqual({ "data-theme": "dark" });
    expect(runInitScript({ getItem: () => "light" }, true)).toEqual({ "data-theme": "light" });
  });

  it("follows the phone when nothing, system, or an invalid value is saved", () => {
    expect(runInitScript({ getItem: () => null }, true)).toEqual({ "data-theme": "dark" });
    expect(runInitScript({ getItem: () => "system" }, false)).toEqual({ "data-theme": "light" });
    expect(runInitScript({ getItem: () => "purple" }, true)).toEqual({ "data-theme": "dark" });
  });

  it("still follows the phone when storage is unavailable", () => {
    const blocked = {
      getItem: () => {
        throw new Error("storage blocked");
      },
    };
    expect(runInitScript(blocked, true)).toEqual({ "data-theme": "dark" });
  });
});
