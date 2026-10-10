export type Lang = "en" | "pcm";

export const LANG_STORAGE_KEY = "lang";
export const DEFAULT_LANG: Lang = "en";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "pcm";
}

/** BCP 47 tags for <html lang>. Nigerian Pidgin is `pcm`. */
export const HTML_LANG: Record<Lang, string> = { en: "en-NG", pcm: "pcm" };
