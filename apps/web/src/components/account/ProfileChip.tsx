"use client";

import Link from "next/link";
import { levelFor } from "@naija/game/progress/progress";
import { accountsEnabled } from "@/lib/account/account";
import { useAccount } from "@/lib/account/useAccount";
import { useCopy } from "@/lib/i18n/useCopy";

/** The player's level, with a ring filling toward the next one. Opens the profile. */
export function ProfileChip() {
  const t = useCopy();
  const account = useAccount();
  if (!accountsEnabled) return null;
  const level = account.progress ? levelFor(account.progress.xp) : null;
  const share = level ? level.into / level.needed : 0;
  const r = 15;
  const ring = 2 * Math.PI * r;

  return (
    <Link
      href="/me"
      aria-label={`${t.account.profile}${level ? `, ${t.account.level(level.level)}` : ""}`}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface font-semibold tabular-nums text-brand-ink transition hover:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
    >
      <svg aria-hidden="true" viewBox="0 0 36 36" className="absolute inset-0.5 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface-2" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${share * ring} ${ring}`} className="text-gold" />
      </svg>
      <span className="relative text-sm">{level?.level ?? "·"}</span>
    </Link>
  );
}
