import type { ModeId } from "@naija/game/modes/types";
import type { Award, Progress, SoloResult } from "@naija/game/progress/progress";
import { ROOM_SERVER_URL, usingLocalRooms } from "@/lib/room/serverUrl";

/**
 * The player's account, as the app sees it. Accounts live on the room server (Better Auth):
 * every device gets a guest profile on first use, so XP and badges count from the first game,
 * and signing up keeps them. The session is a bearer token in localStorage (the site and the
 * server are on different domains, where cookies don't work reliably).
 *
 * In local test mode (no room server) there are no accounts: everything here stays "off".
 */

export const accountsEnabled = !usingLocalRooms;

export interface AccountUser {
  id: string;
  name: string;
  isAnonymous: boolean;
}

export interface AccountState {
  status: "off" | "loading" | "ready" | "offline";
  user: AccountUser | null;
  progress: Progress | null;
}

export type AuthError = "exists" | "badLogin" | "weakPassword" | "badEmail" | "generic" | "offline";

const TOKEN_KEY = "ng-auth-token";
const api = (path: string) => `${ROOM_SERVER_URL.replace(/\/$/, "")}${path}`;

// ---------- Token ----------

let memoryToken: string | null = null;

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

function setToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: the session lasts until the page closes.
  }
}

// ---------- State (for useSyncExternalStore) ----------

const OFF: AccountState = { status: "off", user: null, progress: null };
let state: AccountState = accountsEnabled ? { status: "loading", user: null, progress: null } : OFF;
const listeners = new Set<() => void>();

function setState(next: AccountState) {
  state = next;
  listeners.forEach((notify) => notify());
}

export const subscribeAccount = (onChange: () => void) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};
export const getAccountSnapshot = () => state;
export const getServerAccountSnapshot = () => OFF;

// ---------- Requests ----------

async function call(path: string, init: RequestInit = {}, token = getToken()): Promise<Response> {
  return fetch(api(path), {
    ...init,
    headers: {
      ...(init.body && { "content-type": "application/json" }),
      ...(token && { authorization: `Bearer ${token}` }),
      ...init.headers,
    },
  });
}

let guestPromise: Promise<string | null> | null = null;

/** The session token, signing in as a guest first if this device has none. Null when offline. */
export function ensureSession(): Promise<string | null> {
  if (!accountsEnabled) return Promise.resolve(null);
  const token = getToken();
  if (token) return Promise.resolve(token);
  guestPromise ??= (async () => {
    try {
      const res = await call("/api/auth/sign-in/anonymous", { method: "POST", body: "{}" }, null);
      const fresh = res.ok ? res.headers.get("set-auth-token") : null;
      if (fresh) setToken(fresh);
      return fresh;
    } catch {
      return null;
    } finally {
      guestPromise = null;
    }
  })();
  return guestPromise;
}

/** Loads the user and their progress. A dead session (e.g. after signing out elsewhere) starts a new guest. */
export async function refreshAccount(retry = true): Promise<void> {
  if (!accountsEnabled) return;
  const token = await ensureSession();
  if (!token) return setState({ ...state, status: "offline" });
  try {
    const res = await call("/api/me");
    if (res.status === 401 && retry) {
      setToken(null);
      return refreshAccount(false);
    }
    if (!res.ok) return setState({ ...state, status: "offline" });
    const body = (await res.json()) as { user: AccountUser; progress: Progress };
    setState({ status: "ready", user: body.user, progress: body.progress });
  } catch {
    setState({ ...state, status: "offline" });
  }
}

function authError(code: string | undefined): AuthError {
  if (!code) return "generic";
  if (code.startsWith("USER_ALREADY_EXISTS")) return "exists";
  if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_PASSWORD" || code === "USER_NOT_FOUND") return "badLogin";
  if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") return "weakPassword";
  if (code === "INVALID_EMAIL") return "badEmail";
  return "generic";
}

/**
 * Signs up or in. The guest session goes along, so the server moves the guest's progress into
 * the account; the account's new token replaces the guest's.
 */
async function authenticate(path: string, body: Record<string, string>): Promise<AuthError | null> {
  try {
    await ensureSession();
    const res = await call(path, { method: "POST", body: JSON.stringify(body) });
    const token = res.headers.get("set-auth-token");
    if (!res.ok || !token) return authError(((await res.json().catch(() => ({}))) as { code?: string }).code);
    setToken(token);
    await refreshAccount();
    return null;
  } catch {
    return "offline";
  }
}

export const signUp = (name: string, email: string, password: string) =>
  authenticate("/api/auth/sign-up/email", { name, email: email.trim(), password });

export const signIn = (email: string, password: string) => authenticate("/api/auth/sign-in/email", { email: email.trim(), password });

/** Signs out; this device carries on as a fresh guest. */
export async function signOut(): Promise<void> {
  try {
    await call("/api/auth/sign-out", { method: "POST", body: "{}" });
  } catch {
    // Offline: forgetting the token here is what matters.
  }
  setToken(null);
  await refreshAccount();
}

/** Reports a finished solo quiz; returns what it earned, or null (offline, too soon, no accounts). */
export async function submitSolo(result: SoloResult): Promise<Award | null> {
  if (!accountsEnabled) return null;
  try {
    await ensureSession();
    const res = await call("/api/progress/solo", { method: "POST", body: JSON.stringify(result) });
    if (!res.ok) return null;
    void refreshAccount();
    return ((await res.json()) as { award: Award }).award;
  } catch {
    return null;
  }
}

export interface LeaderRow {
  userId: string;
  name: string;
  played: number;
  wins: number;
  rank: number | null;
  rr: number;
}

export async function fetchLeaderboard(mode: ModeId, by: "wins" | "rank"): Promise<LeaderRow[] | null> {
  if (!accountsEnabled) return null;
  try {
    const res = await call(`/api/leaderboard?mode=${mode}&by=${by}`, {}, null);
    return res.ok ? ((await res.json()) as { rows: LeaderRow[] }).rows : null;
  } catch {
    return null;
  }
}
