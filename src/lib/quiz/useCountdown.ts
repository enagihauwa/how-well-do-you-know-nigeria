import { useEffect, useRef, useState } from "react";

interface UseCountdownOptions {
  seconds: number;
  /** The countdown ticks only while true. Turning it off freezes the remaining time. */
  running: boolean;
  onExpire: () => void;
}

/**
 * Single countdown for one question. Mount it with a `key` per question so it
 * starts fresh each time. Remaining time is computed from an end timestamp, not
 * by counting ticks, so it stays accurate when the tab is throttled.
 * It only reports expiry; the reducer decides what an expiry means.
 */
export function useCountdown({ seconds, running, onExpire }: UseCountdownOptions): number {
  const [remainingMs, setRemainingMs] = useState(seconds * 1000);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!running) return;

    const endTime = Date.now() + remainingMs;
    const id = setInterval(() => {
      const left = Math.max(0, endTime - Date.now());
      setRemainingMs(left);
      if (left === 0) {
        clearInterval(id);
        onExpireRef.current();
      }
    }, 100);

    return () => clearInterval(id);
    // `remainingMs` is intentionally read only when (re)starting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return remainingMs;
}
