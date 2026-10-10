import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { getMigrations } from "better-auth/db/migration";
import { anonymous } from "better-auth/plugins/anonymous";
import { bearer } from "better-auth/plugins/bearer";
import { Pool } from "pg";
import { cleanName } from "@naija/game/room/engine";
import { memoryProgressStore, postgresProgressStore, type ProgressStore } from "./progressStore";

/**
 * Accounts are optional. Every device gets a guest user on first use (Better Auth's anonymous
 * plugin), so progress counts from the first game. Signing up (email and password) keeps that
 * progress and works on any device; signing in on a device that has guest progress merges it in.
 *
 * Sessions travel as bearer tokens, not cookies: the site and this server are on different
 * domains, where browsers block third-party cookies.
 */

export interface AccountUser {
  id: string;
  name: string;
  isAnonymous: boolean;
}

export interface Accounts {
  /** Better Auth's HTTP handler, mounted at /api/auth/*. */
  handler: (request: Request) => Promise<Response>;
  /** The user behind a bearer token, or null if it is missing, invalid or expired. */
  userFromToken(token: string | undefined | null): Promise<AccountUser | null>;
  progress: ProgressStore;
  close(): Promise<void>;
}

export interface AccountsOptions {
  /** Postgres connection string. Unset: everything in memory, lost on restart. */
  databaseUrl?: string;
  /** Signs session tokens. Required in production (BETTER_AUTH_SECRET). */
  secret: string;
  /** This server's public URL, e.g. https://naija-rooms.up.railway.app. */
  baseURL: string;
  /** Sites allowed to call the auth endpoints. Empty: any (development). */
  allowedOrigins: string[];
}

export const AUTH_BASE_PATH = "/api/auth";

export async function createAccounts(options: AccountsOptions): Promise<Accounts> {
  const pool = options.databaseUrl ? new Pool({ connectionString: options.databaseUrl }) : null;
  const memory: MemoryDB = { user: [], session: [], account: [], verification: [] };

  // The store is created after the auth config (Postgres needs Better Auth's tables first), but
  // the link hook below needs it: it is only called once requests arrive, by which time it is set.
  let progress: ProgressStore | null = null;

  const config = {
    database: pool ?? memoryAdapter(memory),
    secret: options.secret,
    baseURL: options.baseURL,
    basePath: AUTH_BASE_PATH,
    trustedOrigins: options.allowedOrigins.length
      ? options.allowedOrigins
      : (request?: Request) => [request?.headers.get("origin") ?? null],
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    databaseHooks: {
      user: {
        create: {
          // Names show on leaderboards: same rules as room nicknames.
          before: async (user: { name: string }) => ({ data: { ...user, name: cleanName(user.name ?? "") || "Player" } }),
        },
      },
    },
    plugins: [
      anonymous({
        generateName: () => "Guest",
        // Runs on sign-up and sign-in from a guest session, just before Better Auth deletes the
        // guest: everything the guest earned moves to the account.
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await progress!.merge(anonymousUser.user.id, newUser.user.id);
        },
      }),
      bearer(),
    ],
  } satisfies Parameters<typeof betterAuth>[0];

  if (pool) {
    const { runMigrations } = await getMigrations(config);
    await runMigrations();
  }
  const auth = betterAuth(config);
  progress = pool
    ? await postgresProgressStore(pool)
    : memoryProgressStore(() => memory.user as { id: string; name: string; isAnonymous?: boolean }[]);

  return {
    handler: auth.handler,
    async userFromToken(token) {
      if (!token) return null;
      const session = await auth.api.getSession({ headers: new Headers({ authorization: `Bearer ${token}` }) });
      if (!session) return null;
      const user = session.user as { id: string; name: string; isAnonymous?: boolean | null };
      return { id: user.id, name: user.name, isAnonymous: !!user.isAnonymous };
    },
    progress,
    close: async () => {
      await pool?.end();
    },
  };
}
