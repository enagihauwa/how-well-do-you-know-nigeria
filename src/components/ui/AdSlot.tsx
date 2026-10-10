"use client";

import { useCopy } from "@/lib/i18n/useCopy";

/**
 * A non-intrusive ad space. Rules: only on calm screens (home, results, between rounds), never
 * while a question or timer is running; fixed height so nothing jumps when the ad loads; labelled.
 * Off unless NEXT_PUBLIC_ADS_ENABLED=true. Wire the ad network's tag in here when there is one.
 */
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";

interface AdSlotProps {
  /** Ad network placement id. */
  placement: "home" | "results" | "between-rounds";
  className?: string;
}

export function AdSlot({ placement, className = "" }: AdSlotProps) {
  const t = useCopy();
  if (!ADS_ENABLED) return null;
  return (
    <aside
      aria-label={t.ad}
      data-ad-placement={placement}
      className={`mx-auto flex h-[100px] w-full max-w-[728px] flex-col overflow-hidden rounded-xl border border-line bg-surface ${className}`}
    >
      <span className="px-2 pt-1 text-left text-[11px] font-semibold tracking-wider text-muted">
        {t.ad}
      </span>
      {/* The ad network renders into this box. */}
      <div className="flex-1" />
    </aside>
  );
}
