"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, isTheme, type Theme } from "@/lib/theme";

// The <html data-theme> attribute is the single source of truth. It is set before first paint by
// the inline script in the root layout, so the toggle reads it instead of keeping its own copy.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

// The server always renders light; React then corrects this on the client without a mismatch error.
const getServerSnapshot = (): Theme => "light";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // In development, Strict Mode's remount clears attributes set by the inline script. Re-apply
  // the saved theme before paint. This is a no-op in production.
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (isTheme(saved)) document.documentElement.setAttribute("data-theme", saved);
    } catch {
      // Storage unavailable: keep whatever is already applied.
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice still applies until the page is closed.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label="Dark mode"
      title="Toggle dark mode"
      className="fixed right-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 bg-surface text-foreground shadow-sm transition hover:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
    >
      {/* Both icons are always rendered and swapped with CSS, so the icon is right before JS runs. */}
      {/* Shows the mode you will switch to: moon in light mode, sun in dark mode. */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="h-5 w-5 dark:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="hidden h-5 w-5 dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    </button>
  );
}
