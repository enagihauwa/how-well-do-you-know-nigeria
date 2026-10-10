import { MODE_IDS } from "@/lib/modes";
import type { ModeAction } from "@/lib/modes";
import type { CategoryId } from "@/lib/types";
import { categories } from "@/data/categories";
import { CHAT_MAX_LENGTH, MAX_NAME_LENGTH, type ClientAction } from "./engine";
import type { ClientMessage } from "./protocol";

/**
 * Checks the shape of everything a phone sends before it reaches the room engine. The engine
 * assumes well-formed actions; anything malformed is dropped here, so a bad or hostile client
 * cannot crash a room. Limits are generous for real use and small enough to bound the work.
 */

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CATEGORY_IDS = new Set<string>(categories.map((c) => c.id));
const TEAM_PATTERN = /^t[0-3]$/;

function parseModeAction(v: unknown): ModeAction | null {
  if (!isObject(v)) return null;
  switch (v.type) {
    case "next":
    case "skip":
      return { type: v.type };
    case "lock":
      return str(v.option, 200) ? { type: "lock", option: v.option } : null;
    case "guess":
      return str(v.text, 100) ? { type: "guess", text: v.text } : null;
    case "answer": {
      const a = v.answer;
      if (typeof a === "number" && Number.isFinite(a)) return { type: "answer", answer: a };
      if (Array.isArray(a) && a.length <= 8 && a.every((x) => str(x, 200))) return { type: "answer", answer: a };
      return null;
    }
    default:
      return null;
  }
}

export function parseAction(v: unknown): ClientAction | null {
  if (!isObject(v)) return null;
  switch (v.type) {
    case "join":
      return str(v.name, MAX_NAME_LENGTH * 4) ? { type: "join", name: v.name } : null;
    case "leave":
    case "add_team":
    case "add_bot":
    case "start":
    case "back_to_lobby":
      return { type: v.type };
    case "set_team":
      if (v.teamId === null) return { type: "set_team", teamId: null };
      return str(v.teamId, 4) && TEAM_PATTERN.test(v.teamId) ? { type: "set_team", teamId: v.teamId } : null;
    case "remove_team":
      return str(v.teamId, 4) && TEAM_PATTERN.test(v.teamId) ? { type: "remove_team", teamId: v.teamId } : null;
    case "set_mode":
      return typeof v.mode === "string" && (MODE_IDS as string[]).includes(v.mode)
        ? { type: "set_mode", mode: v.mode as (typeof MODE_IDS)[number] }
        : null;
    case "set_trivia": {
      const out: Extract<ClientAction, { type: "set_trivia" }> = { type: "set_trivia" };
      if (v.category !== undefined) {
        if (typeof v.category !== "string" || !CATEGORY_IDS.has(v.category)) return null;
        out.category = v.category as CategoryId;
      }
      if (v.answerRule !== undefined) {
        if (v.answerRule !== "team_lock" && v.answerRule !== "individual") return null;
        out.answerRule = v.answerRule;
      }
      return out;
    }
    case "set_same_room":
      return typeof v.value === "boolean" ? { type: "set_same_room", value: v.value } : null;
    case "kick":
      return str(v.playerId, 64) && ID_PATTERN.test(v.playerId) ? { type: "kick", playerId: v.playerId } : null;
    case "chat":
      return str(v.text, CHAT_MAX_LENGTH * 4) && typeof v.toTeam === "boolean"
        ? { type: "chat", text: v.text, toTeam: v.toTeam }
        : null;
    case "mode": {
      const action = parseModeAction(v.action);
      return action ? { type: "mode", action } : null;
    }
    default:
      return null;
  }
}

/** Parses one WebSocket frame. Returns null for anything that is not a valid message. */
export function parseClientMessage(raw: string): ClientMessage | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(v)) return null;
  if (v.type === "hello") {
    if (!str(v.playerId, 64) || !ID_PATTERN.test(v.playerId)) return null;
    if (!str(v.secret, 128) || v.secret.length < 16) return null;
    if (!str(v.name, MAX_NAME_LENGTH * 4)) return null;
    return { type: "hello", playerId: v.playerId, secret: v.secret, name: v.name };
  }
  if (v.type === "action") {
    const action = parseAction(v.action);
    return action ? { type: "action", action } : null;
  }
  return null;
}
