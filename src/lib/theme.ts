export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
/** First-time visitors always get light, regardless of their operating system setting. */
export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Runs in <head> while the HTML is being parsed, before the first paint, so a saved theme is
 * applied without a flash. If storage is unavailable, the server-rendered default stays.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});document.documentElement.setAttribute("data-theme",t==="dark"||t==="light"?t:${JSON.stringify(
  DEFAULT_THEME,
)})}catch(e){}})()`;
