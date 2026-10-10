"use client";

import { Button } from "@/components/ui/Button";
import { useCopy } from "@/lib/i18n/useCopy";

interface HostNextProps {
  isHost: boolean;
  /** No host (Quick Play): the room moves on by itself. */
  hostless?: boolean;
  label?: string;
  onNext: () => void;
}

/** The host moves the room on; everyone else sees that they are waiting. */
export function HostNext({ isHost, hostless = false, label, onNext }: HostNextProps) {
  const t = useCopy();
  if (hostless) return <p className="text-center text-sm font-semibold text-muted">{t.match.autoNext}</p>;
  return isHost ? (
    <Button onClick={onNext} className="anim-enter w-full">
      {label ?? t.common.next}
    </Button>
  ) : (
    <p className="text-center text-sm font-semibold text-muted">{t.match.waitingForHostNext}</p>
  );
}
