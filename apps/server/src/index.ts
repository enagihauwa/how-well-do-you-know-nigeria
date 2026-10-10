import { noTalkAmCards } from "@naija/game/data/noTalkAmCards";
import { allQuestions } from "@naija/game/data/questions";
import { sortItems } from "@naija/game/data/sortItems";
import { yearItems } from "@naija/game/data/yearItems";
import { createAccounts } from "./accounts";
import { startRoomServer } from "./roomServer";

// Entry point: `npm run server`. PORT is set by the host (Railway, Render, Fly…); 8787 locally.
// Locally, settings can go in apps/server/.env (see .env.example).
try {
  process.loadEnvFile();
} catch {
  // No .env file: settings come from the environment.
}

const log = (message: string) => console.log(`[${new Date().toISOString()}] ${message}`);
const port = Number(process.env.PORT ?? 8787);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Staging and testing: fewer players and a shorter countdown, so a match starts without a crowd.
const minPlayers = Number(process.env.QUICKPLAY_MIN_PLAYERS) || undefined;
const countdownMs = Number(process.env.QUICKPLAY_COUNTDOWN_MS) || undefined;
const override = { ...(minPlayers && { minPlayers }), ...(countdownMs && { countdownMs }) };

const DEV_SECRET = "development-only-secret-do-not-use-in-production";
const secret = process.env.BETTER_AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? "" : DEV_SECRET);
if (!secret) {
  console.error("BETTER_AUTH_SECRET is not set. Generate one with: openssl rand -base64 32");
  process.exit(1);
}

async function main() {
  const accounts = await createAccounts({
    databaseUrl: process.env.DATABASE_URL,
    secret,
    baseURL: process.env.PUBLIC_URL ?? `http://localhost:${port}`,
    allowedOrigins,
  });
  if (!process.env.DATABASE_URL) log("DATABASE_URL not set: accounts and progress are kept in memory and lost on restart");

  await startRoomServer({
    queues: { solo: override, squads: override },
    port,
    content: { questions: allQuestions, cards: noTalkAmCards, years: yearItems, sorts: sortItems },
    allowedOrigins,
    accounts,
    log,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
