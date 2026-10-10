"use client";

import { useEffect, useState } from "react";

const secondsUntil = (endsAt: number) => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

/**
 * Whole seconds left until `endsAt` (local clock). Re-renders once per second, on the second
 * boundary, instead of on every frame; the smooth part of a timer is a CSS animation.
 * While `running` is false it stops ticking and keeps the last value.
 */
export function useSecondsLeft(endsAt: number, running = true): number {
  const [seconds, setSeconds] = useState(() => secondsUntil(endsAt));

  useEffect(() => {
    if (!running || !endsAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const left = endsAt - Date.now();
      setSeconds(secondsUntil(endsAt));
      if (left > 0) timer = setTimeout(tick, left % 1000 || 1000);
    };
    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [endsAt, running]);

  return seconds;
}
