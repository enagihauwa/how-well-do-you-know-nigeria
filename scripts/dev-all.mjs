// `npm run dev:all`: the room server and the app together, with the app pointed at the server,
// so multiplayer works exactly as it will when deployed. Ctrl+C stops both.
import { spawn } from "node:child_process";

const ROOM_PORT = process.env.ROOM_PORT ?? "8787";
const env = { ...process.env, NEXT_PUBLIC_ROOM_SERVER_URL: `http://localhost:${ROOM_PORT}` };

const children = [
  spawn("npm", ["run", "dev:server"], { stdio: "inherit", env: { ...env, PORT: ROOM_PORT } }),
  spawn("npm", ["run", "dev"], { stdio: "inherit", env }),
];

const stop = () => children.forEach((child) => child.kill("SIGINT"));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) child.on("exit", (code) => code && stop());
