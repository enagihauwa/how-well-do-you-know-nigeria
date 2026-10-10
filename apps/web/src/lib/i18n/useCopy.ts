"use client";

import { useSyncExternalStore } from "react";
import { copy, type Copy } from "./copy";
import { DEFAULT_LANG, HTML_LANG, LANG_STORAGE_KEY, isLang, type Lang } from "./lang";

// The saved language lives in localStorage. Changes in this tab notify subscribers directly;
// changes in another tab arrive through the `storage` event.
const listeners = new Set<() => void>();
// Used when storage is blocked, so the toggle still works until the page is closed.
let memoryLang: Lang = DEFAULT_LANG;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(saved) ? saved : memoryLang;
  } catch {
    return memoryLang;
  }
}

// The server always renders the default; React switches to the saved language after hydration.
const getServerSnapshot = (): Lang => DEFAULT_LANG;

export function setLang(lang: Lang) {
  memoryLang = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage unavailable: the choice is lost on reload, which is acceptable.
  }
  document.documentElement.lang = HTML_LANG[lang];
  listeners.forEach((notify) => notify());
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCopy(): Copy {
  return copy[useLang()];
}
