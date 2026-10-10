"use client";

import { TimerBar } from "@/components/quiz/TimerBar";
import { useCopy } from "@/lib/i18n/useCopy";
import type { RoomView } from "@naija/game/room/engine";
import { useSecondsLeft } from "@/lib/quiz/useSecondsLeft";
import { TopBar } from "@/components/ui/TopBar";
import { Scoreboard } from "./Scoreboard";

interface MatchHeaderProps {
  view: RoomView;
  clockOffset: number;
  title: string;
  progress: string;
  teamScores: Record<string, number>;
  /** Timer shown while answering; null hides it. */
  timer: { endsAt: number; totalSeconds: number } | null;
  /** During a reveal: when it auto-advances. */
  autoNextAt?: number;
}

export function MatchHeader({ view, clockOffset, title, progress, teamScores, timer, autoNextAt }: MatchHeaderProps) {
  const t = useCopy();
  // Room deadlines are on the server's clock; convert to this phone's clock once.
  const localEndsAt = timer ? timer.endsAt - clockOffset : 0;
  const localNextAt = autoNextAt ? autoNextAt - clockOffset : 0;
  const secondsLeft = useSecondsLeft(localEndsAt);
  const untilNext = useSecondsLeft(localNextAt);

  return (
    <header>
      <TopBar title={title} />
      <div className="mt-3">
        <Scoreboard view={view} teamScores={teamScores} />
      </div>
      <p className="mt-4 text-sm font-medium text-muted">{progress}</p>
      <div className="mt-2 mb-4 min-h-7">
        {timer ? (
          <TimerBar key={localEndsAt} endsAt={localEndsAt} totalSeconds={timer.totalSeconds} secondsLeft={secondsLeft} />
        ) : autoNextAt ? (
          <p className="text-sm font-semibold text-muted">{t.match.nextIn(untilNext)}</p>
        ) : null}
      </div>
    </header>
  );
}
