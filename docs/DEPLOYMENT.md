# Deploying How Well Do You Know Nigeria?

The app has two parts. They live in the same repository but run in two different places.

| Part | What it does | Where it runs | Start command |
|---|---|---|---|
| **Website** | The Next.js app people open in the browser: solo play, screens, lobby | Vercel (already deployed) | Vercel builds it automatically |
| **Room server** | Keeps multiplayer rooms alive: every phone in a game stays connected to it for the whole match | Railway (not deployed yet) | `npm run server` |

```
phones ──► website (Vercel)          pages, buttons, solo play
   │
   └────► room server (Railway)      live rooms, timers, chat, Quick Play
```

**Why not put the room server on Vercel too?** Vercel runs code in short bursts that stop after each request. The room server has to keep running and hold every player's connection open for the whole match, so it needs a host for long-running servers. Railway is one; Render or Fly.io would also work.

**Without the room server**, the website still works: solo play is unchanged, and multiplayer falls back to a test mode that only works between tabs on one device, with Quick Play turned off.

## Recommended setup: Vercel for the website, Railway for the room server

Do these in order. Merging the code first would put the new version live before multiplayer can work.

### 1. Deploy the room server on Railway

Whoever owns the Railway account does this.

1. Create a new Railway project with one service from this repository. Either:
   - **From GitHub:** Railway needs access to the repository, so the repository owner (or someone with admin access) approves the Railway GitHub app; or
   - **From a computer:** with the [Railway CLI](https://docs.railway.com/guides/cli), run `railway up` in the project folder. This uploads the code directly and needs no GitHub access.
2. In the service's **Settings**:
   - **Start command:** `npm run server`
   - **Replicas: 1.** Rooms live in the server's memory, so a second copy would split players into rooms that can't see each other.
   - **Networking → Generate domain** to get a public address, e.g. `https://naija-rooms.up.railway.app`.
3. In the service's **Variables**:
   - `ALLOWED_ORIGINS` = the website's address, e.g. `https://how-well-do-you-know-nigeria.vercel.app`. Add more, separated by commas, if the site has a custom domain too. This stops other websites from using the server.
   - `PORT` is set by Railway automatically. Do not set it.
4. Check it is running: open `https://<railway-domain>/health` in a browser. It should show `{"ok":true,"rooms":0}`.

### 2. Point the website at the room server (Vercel)

Someone with access to the Vercel project's settings (the owner) does this.

1. Vercel → the project → **Settings → Environment Variables**.
2. Add `NEXT_PUBLIC_ROOM_SERVER_URL` = the Railway address from step 1, e.g. `https://naija-rooms.up.railway.app`. Apply it to **Production** (and **Preview** if preview deployments should use it).
3. This value is built into the website, so it only takes effect on the **next** deployment. Step 3 triggers one; to apply it without new code, use **Deployments → Redeploy** on the latest one.

### 3. Merge the code

Merge the pull request into `main`. Vercel deploys it automatically, now with the room server address built in.

### 4. Check it works

- Open the site on two phones (or a phone and a laptop).
- On one: **Play with friends → Create room**. On the other: type the room code and join.
- Pick teams and start a game. Both screens should move together.
- **Quick play** needs 6 players before a match starts. To try it with fewer people, set `QUICKPLAY_MIN_PLAYERS=2` on Railway for a while, then remove it.

## Alternative: everything on Railway

The website can also run on Railway as a second service from the same repository (build `npm run build`, start `npm start`, and set `NEXT_PUBLIC_ROOM_SERVER_URL` on that service). This keeps both parts in one account, but the site gets a new web address, and the Vercel deployment keeps serving the old version until it is removed. Only worth it if the Vercel project will not be used any more.

## Costs and limits

- **Railway:** the Hobby plan is about US$5 a month. One room-server instance handled about 1,000 concurrent players comfortably in testing.
- **Rooms are in memory.** A restart or redeploy of the room server ends the games in progress; players see "reconnecting" and then "room not found". Deploy the room server when few people are playing.
- **Preview deployments:** Vercel preview addresses change every time. If previews need multiplayer, add their address to `ALLOWED_ORIGINS`, or leave previews in test mode.

## If something goes wrong

| What you see | Likely cause |
|---|---|
| "Can't reach the game server" when creating a room | The room server is down, `NEXT_PUBLIC_ROOM_SERVER_URL` has a typo, or the site's address is not in `ALLOWED_ORIGINS` on Railway (it must match exactly, including `https://`) |
| Multiplayer says "Test mode: friends join from other tabs" | The website was built without `NEXT_PUBLIC_ROOM_SERVER_URL` |
| `/health` does not load | The room server is not running: check the Railway deploy logs and that the start command is `npm run server` |
