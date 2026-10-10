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
const INK_ON_GOLD = hexToRgb("#17201b");

describe.each(["light", "dark"] as const)("%s theme colour contrast (WCAG AA)", (name) => {
  const t = themes[name];
  const surfaces = { page: t.background, card: t.surface, "raised tile": t["surface-2"] };

  it("body text is comfortably readable (7:1)", () => {
    for (const bg of Object.values(surfaces)) expect(contrast(t.foreground, bg)).toBeGreaterThanOrEqual(7);
  });

  it.each(Object.entries(surfaces))("secondary text (--muted) has 4.5:1 on the %s", (_l, bg) => {
    expect(contrast(t.muted, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.entries({ ...surfaces, "pale green": t["brand-soft"] }))(
    "green text (--brand-ink) has 4.5:1 on the %s",
    (_l, bg) => {
      expect(contrast(t["brand-ink"], bg)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("text on the green button (--on-brand) has 4.5:1, and on its hover colour", () => {
    expect(contrast(t["on-brand"], t.brand)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["on-brand"], t["brand-hover"])).toBeGreaterThanOrEqual(4.5);
  });

  it("the home hero card's text has 4.5:1", () => {
    expect(contrast(t["hero-ink"], t.hero)).toBeGreaterThanOrEqual(4.5);
  });

  it("deep green (--brand-deep) has 4.5:1 on pale green", () => {
    expect(contrast(t["brand-deep"], t["brand-soft"])).toBeGreaterThanOrEqual(4.5);
  });

  it("the yellow accent pairs are readable", () => {
    expect(contrast(t["gold-ink"], t["gold-soft"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK_ON_GOLD, t.gold)).toBeGreaterThanOrEqual(4.5);
  });

  it("error text (--danger-ink) has 4.5:1 on the card and its own pale fill", () => {
    expect(contrast(t["danger-ink"], t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["danger-ink"], t["danger-soft"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["danger-ink"], t.background)).toBeGreaterThanOrEqual(4.5);
  });

  it("the wrong-answer letter (card colour on --danger-ink) has 4.5:1", () => {
    expect(contrast(t.surface, t["danger-ink"])).toBeGreaterThanOrEqual(4.5);
  });

  it("timer fills (green, and red when time is low) have 3:1 against their track (--line)", () => {
    expect(contrast(t.brand, t.line)).toBeGreaterThanOrEqual(3);
    expect(contrast(t["danger-fill"], t.line)).toBeGreaterThanOrEqual(3);
  });

  it("the keyboard focus ring has 3:1 on the page, cards and pale green", () => {
    for (const bg of [t.background, t.surface, t["brand-soft"]]) {
      expect(contrast(t["focus-ring"], bg)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("components use the colour tokens", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith(".tsx")) files.push(full);
    }
  };
  walk(join(root, "src/components"));

  it("no faded-opacity text: secondary text uses --muted, which is contrast-checked above", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file.slice(root.length)).not.toMatch(/(?<![\w:-])text-foreground\/\d+/);
    }
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

  it("has no theme tokens, variables or dark: variants", () => {
    expect(code).not.toMatch(/dark:|var\(|brand|surface|danger|focus|foreground|background|muted/);
  });
});
