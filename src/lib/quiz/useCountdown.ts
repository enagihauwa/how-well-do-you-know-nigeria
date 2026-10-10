import { useEffect, useRef, useState } from "react";
import { useSecondsLeft } from "./useSecondsLeft";

interface UseCountdownOptions {
  seconds: number;
  /** The countdown runs only while true. Turning it off freezes it. */
  running: boolean;
  onExpire: () => void;
}

/**
 * Single countdown for one question. Mount it with a `key` per question so it starts fresh.
 * It fires `onExpire` from one timeout at the deadline (no polling), and reports whole seconds
 * once a second. The bar itself animates in CSS from `endsAt`, so nothing re-renders per frame.
 */
export function useCountdown({ seconds, running, onExpire }: UseCountdownOptions) {
  const [endsAt] = useState(() => Date.now() + seconds * 1000);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => onExpireRef.current(), Math.max(0, endsAt - Date.now()));
    return () => clearTimeout(id);
  }, [running, endsAt]);

  return { endsAt, secondsLeft: useSecondsLeft(endsAt, running) };
}
