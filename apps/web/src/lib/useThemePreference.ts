"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_PREFERENCE,
  THEME_STORAGE_KEY,
  isThemePreference,
  resolveTheme,
  type ThemePreference,
} from "./theme";

const listeners = new Set<() => void>();
let memoryPreference: ThemePreference = DEFAULT_PREFERENCE;
const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(saved) ? saved : memoryPreference;
  } catch {
    return memoryPreference;
  }
}

function apply(preference: ThemePreference) {
  const theme = resolveTheme(preference, window.matchMedia(DARK_QUERY).matches);
  document.documentElement.setAttribute("data-theme", theme);
}

export function setThemePreference(preference: ThemePreference) {
  memoryPreference = preference;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable: applies until the page is closed.
  }
  apply(preference);
  listeners.forEach((notify) => notify());
}

/** The player's theme choice. Also follows the phone live while the choice is "system". */
export function useThemePreference(): ThemePreference {
  const preference = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PREFERENCE);

  useEffect(() => {
    // Strict Mode's remount in development can drop the attribute the head script set.
    apply(preference);
    if (preference !== "system") return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  return preference;
}
