export type Theme = "light" | "dark";
/** What the player chose. `system` follows the phone's light/dark setting. */
export type ThemePreference = Theme | "system";

export const THEME_STORAGE_KEY = "theme";
/** First-time visitors follow their phone's setting. */
export const DEFAULT_PREFERENCE: ThemePreference = "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

/**
 * Runs in <head> while the HTML is being parsed, before the first paint, so the right theme is
 * applied without a flash. If storage is unavailable it still follows the phone's setting.
 */
export const themeInitScript = `(function(){var p=${JSON.stringify(DEFAULT_PREFERENCE)};try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(s==="light"||s==="dark"||s==="system")p=s}catch(e){}var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")})()`;
