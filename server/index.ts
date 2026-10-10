import { noTalkAmCards } from "@/data/noTalkAmCards";
import { allQuestions } from "@/data/questions";
import { sortItems } from "@/data/sortItems";
import { yearItems } from "@/data/yearItems";
import { startRoomServer } from "./roomServer";

// Entry point: `npm run server`. PORT is set by the host (Railway, Render, Fly…); 8787 locally.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Staging and testing: fewer players and a shorter countdown, so a match starts without a crowd.
const minPlayers = Number(process.env.QUICKPLAY_MIN_PLAYERS) || undefined;
const countdownMs = Number(process.env.QUICKPLAY_COUNTDOWN_MS) || undefined;
const override = { ...(minPlayers && { minPlayers }), ...(countdownMs && { countdownMs }) };

void startRoomServer({
  queues: { solo: override, squads: override },
  port: Number(process.env.PORT ?? 8787),
  content: { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems },
  allowedOrigins,
  log: (message) => console.log(`[${new Date().toISOString()}] ${message}`),
});
