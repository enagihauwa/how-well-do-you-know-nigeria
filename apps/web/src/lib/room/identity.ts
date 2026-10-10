/**
 * Guest identity until accounts exist. With the room server, the player id and secret are per
 * device (localStorage), so a phone keeps its seat even if the browser closes the tab. In local
 * development (no server) they are per tab (sessionStorage), so several tabs can be different
 * players. With accounts, the id becomes the Better Auth guest id.
 */

const seatStorage = (): Storage =>
  process.env.NEXT_PUBLIC_ROOM_SERVER_URL ? localStorage : sessionStorage;

const PLAYER_ID_KEY = "ng-player-id";
/** The name this tab confirmed for rooms. Per tab, so a shared phone or a second tab asks again. */
const TAB_NAME_KEY = "ng-tab-name";
const NICKNAME_KEY = "ng-nickname";

let fallbackId: string | null = null;

export function getPlayerId(): string {
  try {
    let id = seatStorage().getItem(PLAYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      seatStorage().setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    fallbackId ??= crypto.randomUUID();
    return fallbackId;
  }
}

const SECRET_KEY = "ng-player-secret";
let fallbackSecret: string | null = null;

/** Sent with every connection; the server only lets the phone holding it into this player's seat. */
export function getPlayerSecret(): string {
  try {
    let secret = seatStorage().getItem(SECRET_KEY);
    if (!secret) {
      secret = crypto.randomUUID() + crypto.randomUUID();
      seatStorage().setItem(SECRET_KEY, secret);
    }
    return secret;
  } catch {
    fallbackSecret ??= crypto.randomUUID() + crypto.randomUUID();
    return fallbackSecret;
  }
}

export function getSavedNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

const nicknameListeners = new Set<() => void>();
let memoryNickname = "";
let memoryTabName = "";

/** For useSyncExternalStore: re-render when the nickname is saved. */
export function subscribeNickname(onChange: () => void) {
  nicknameListeners.add(onChange);
  return () => nicknameListeners.delete(onChange);
}

export function getNicknameSnapshot(): string {
  return getSavedNickname() || memoryNickname;
}

/** The name confirmed in this tab, or "" if the player has not confirmed one here yet. */
export function getTabNameSnapshot(): string {
  try {
    return sessionStorage.getItem(TAB_NAME_KEY) ?? memoryTabName;
  } catch {
    return memoryTabName;
  }
}

/** Saves the name for this tab and as the device default for next time. */
export function saveNickname(name: string) {
  memoryNickname = name;
  memoryTabName = name;
  try {
    sessionStorage.setItem(TAB_NAME_KEY, name);
  } catch {
    // Kept in memory instead.
  }
  try {
    localStorage.setItem(NICKNAME_KEY, name);
  } catch {
    // Storage unavailable: kept in memory until the page is closed.
  }
  nicknameListeners.forEach((notify) => notify());
}
