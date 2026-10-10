"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useCopy } from "@/lib/i18n/useCopy";
import { SettingsSheet } from "./SettingsSheet";

type Back = { label: string } & ({ href: string } | { onClick: () => void });

interface TopBarProps {
  /** A back link or button on the left. */
  back?: Back;
  /** Shown on the left when there is no back action, e.g. the game's name. */
  title?: ReactNode;
}

const backClasses =
  "-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-base font-semibold text-brand-ink transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus";

const arrow = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

/** Every screen's top row: back (or a title) on the left, settings on the right. */
export function TopBar({ back, title }: TopBarProps) {
  const t = useCopy();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <div className="min-w-0">
        {back ? (
          "href" in back ? (
            <Link href={back.href} className={backClasses}>
              {arrow} {back.label}
            </Link>
          ) : (
            <button type="button" onClick={back.onClick} className={backClasses}>
              {arrow} {back.label}
            </button>
          )
        ) : (
          <div className="truncate text-sm font-semibold text-brand-ink">{title}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.settings.open}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-foreground transition hover:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
      </button>
      <SettingsSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
