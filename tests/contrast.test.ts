import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");

// ---------- WCAG helpers ----------
type RGB = [number, number, number];
const hexToRgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
};
const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: RGB) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** `fg` at `alpha` painted over an opaque `bg`. */
const over = (fg: RGB, alpha: number, bg: RGB): RGB =>
  fg.map((v, i) => v * alpha + bg[i] * (1 - alpha)) as RGB;

// ---------- Read the real tokens from globals.css ----------
function block(selector: string): string {
  const start = css.indexOf(selector + " {");
  if (start < 0) throw new Error(`Selector not found in globals.css: ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}
function tokens(source: string): Record<string, RGB> {
  const result: Record<string, RGB> = {};
  for (const [, name, value] of source.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    result[name] = hexToRgb(value);
  }
  return result;
}
const themes = {
  light: tokens(block(":root")),
  dark: tokens(block('[data-theme="dark"]')),
};
const fixed = tokens(block("@theme inline")); // --color-brand, --color-brand-dark, --color-gold
const brand = fixed["color-brand"];

/**
 * The opacity of a progress bar's track (`bg-foreground/NN`), read from the component source so
 * the test checks what is really rendered. A `dark:bg-foreground/NN` class overrides it in dark.
 */
function trackAlpha(file: string, theme: "light" | "dark"): number {
  const line = readFileSync(join(root, file), "utf8")
    .split("\n")
    .find((l) => l.includes("overflow-hidden rounded-full bg-foreground/"));
  if (!line) throw new Error(`Progress bar track not found in ${file}`);
  const base = line.match(/(?<![\w:-])bg-foreground\/(\d+)/);
  const dark = line.match(/dark:bg-foreground\/(\d+)/);
  return +(theme === "dark" && dark ? dark[1] : base![1]) / 100;
}
const brandDark = fixed["color-brand-dark"];
const WHITE: RGB = [255, 255, 255];

describe.each(["light", "dark"] as const)("%s theme colour contrast (WCAG AA)", (name) => {
  const t = themes[name];
  const surfaces = {
    "page background": t.background,
    "card surface": t.surface,
    "pale green tile": t["brand-soft"],
    "hovered tile (50% pale green on card)": over(t["brand-soft"], 0.5, t.surface),
  };

  it("body text is comfortably readable", () => {
    expect(contrast(t.foreground, t.background)).toBeGreaterThanOrEqual(7);
    expect(contrast(t.foreground, t.surface)).toBeGreaterThanOrEqual(7);
  });

  it.each(Object.entries(surfaces))("green text (--brand-ink) has 4.5:1 on the %s", (_label, bg) => {
    expect(contrast(t["brand-ink"], bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("dark green text (--brand-deep) has 4.5:1 on the card and the pale-green banner", () => {
    expect(contrast(t["brand-deep"], t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["brand-deep"], t["brand-soft"])).toBeGreaterThanOrEqual(4.5);
  });

  it("the low-time red number (--danger-ink) has 4.5:1 on the page and card", () => {
    expect(contrast(t["danger-ink"], t.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["danger-ink"], t.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("timer bar fills (green, and red when time is low) have 3:1 against their track on the page", () => {
    const track = over(t.foreground, trackAlpha("src/components/quiz/TimerBar.tsx", name), t.background);
    expect(contrast(brand, track)).toBeGreaterThanOrEqual(3);
    expect(contrast(t["danger-fill"], track)).toBeGreaterThanOrEqual(3);
  });

  it("score bar fill has 3:1 against its track on the results card", () => {
    const track = over(t.foreground, trackAlpha("src/components/screens/ResultsScreen.tsx", name), t.surface);
    expect(contrast(brand, track)).toBeGreaterThanOrEqual(3);
  });

  it("the keyboard focus ring (--focus-ring) has 3:1 on the page, cards and pale-green surfaces", () => {
    for (const bg of [t.background, t.surface, t["brand-soft"]]) {
      expect(contrast(t["focus-ring"], bg)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("text on brand fills", () => {
  it("white text on the green button has 4.5:1, and on its hover colour too", () => {
    expect(contrast(WHITE, brand)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(WHITE, brandDark)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("muted text opacities used in the components", () => {
  // Reads every `text-foreground/NN` class in the source so a future change that makes text too
  // faint fails here. Large text (text-2xl and up) only needs 3:1.
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith(".tsx")) files.push(full);
    }
  };
  walk(join(root, "src/components"));

  const found: { file: string; light: number; dark: number; large: boolean }[] = [];
  for (const file of files) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const base = line.match(/(?<![\w:-])text-foreground\/(\d+)/);
      if (!base) continue;
      const dark = line.match(/dark:text-foreground\/(\d+)/);
      found.push({
        file: file.slice(root.length),
        light: +base[1] / 100,
        dark: (dark ? +dark[1] : +base[1]) / 100,
        large: /text-(2xl|3xl|4xl|5xl|6xl|7xl|8xl)/.test(line),
      });
    }
  }

  it("finds the muted text classes", () => {
    expect(found.length).toBeGreaterThanOrEqual(6);
  });

  it.each(["light", "dark"] as const)("every muted text class is readable in %s mode", (name) => {
    const t = themes[name];
    for (const f of found) {
      const alpha = name === "light" ? f.light : f.dark;
      const ratio = contrast(over(t.foreground, alpha, t.background), t.background);
      expect(ratio, `${f.file} text-foreground/${alpha * 100}`).toBeGreaterThanOrEqual(f.large ? 3 : 4.5);
    }
  });
});

describe("dark palette is unchanged by the light-mode contrast work", () => {
  it("keeps its original values", () => {
    const hex = (c: RGB) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
    expect(Object.fromEntries(Object.entries(themes.dark).map(([k, v]) => [k, hex(v)]))).toEqual({
      background: "#0e1713",
      foreground: "#e8f1ec",
      surface: "#16231c",
      "brand-soft": "#1b3a2b",
      "brand-ink": "#3ecf8e",
      "brand-deep": "#7ae0b4",
      "danger-ink": "#ff637e",
      "danger-fill": "#ff2056",
      "focus-ring": "#f2b705",
    });
  });
});

describe("Nigerian flag colours stay independent of the theme", () => {
  const source = readFileSync(join(root, "src/components/ui/NigerianFlag.tsx"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("uses the literal green-white-green stripes", () => {
    expect([...code.matchAll(/flex-1 (bg-\[#[0-9a-fA-F]{6}\])/g)].map((m) => m[1])).toEqual([
      "bg-[#008751]",
      "bg-[#ffffff]",
      "bg-[#008751]",
    ]);
  });

  it("keeps its original shadow, ring and size, with no theme tokens, variables or dark: variants", () => {
    expect(code).toContain("h-12 w-[4.5rem]");
    expect(code).toContain("shadow-[#008751]/20");
    expect(code).toContain("ring-black/15");
    expect(code).not.toMatch(/dark:|var\(|brand|surface|danger|focus|foreground|background/);
  });
});
