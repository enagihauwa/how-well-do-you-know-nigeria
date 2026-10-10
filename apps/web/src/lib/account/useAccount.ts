"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getAccountSnapshot, getServerAccountSnapshot, refreshAccount, subscribeAccount, type AccountState } from "./account";

let loaded = false;

/** The account and progress; loads them once per page load (creating a guest profile if needed). */
export function useAccount(): AccountState {
  const account = useSyncExternalStore(subscribeAccount, getAccountSnapshot, getServerAccountSnapshot);
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    void refreshAccount();
  }, []);
  return account;
}
